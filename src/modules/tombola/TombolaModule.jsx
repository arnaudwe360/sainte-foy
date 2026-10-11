import { useEffect, useMemo, useState } from "react";
import CloseIcon from "@mui/icons-material/Close";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
} from "firebase/firestore";
import { deleteObject, getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { db, storage } from "../../firebase";
import TicketCanvasEditor from "./TicketCanvasEditor";
import TicketCanvasPreview from "./TicketCanvasPreview";
import {
  createTicketNumbers,
  defaultTicketTemplate,
  normalizeTemplate,
  syncTemplateFromLegacyFields,
} from "./ticketModel";
import { createTicketPrintChunks, openTicketsPrintCenter, openTicketsPrintWindow } from "./ticketPrint";

const templatesCollectionPath = ["modules", "tombola", "templates"];
const batchesCollectionPath = ["modules", "tombola", "batches"];
const assetsCollectionPath = ["modules", "tombola", "assets"];

function createUserSnapshot(user) {
  return {
    uid: user.uid,
    name: user.displayName ?? "",
    email: user.email ?? "",
  };
}

function resolveDate(value) {
  if (!value) return "";
  if (typeof value.toDate === "function") return value.toDate().toLocaleString("fr-FR");
  if (value instanceof Date) return value.toLocaleString("fr-FR");
  return "";
}

function createTemplateSignature(template) {
  const normalizedTemplate = normalizeTemplate(template);
  return JSON.stringify({
    name: normalizedTemplate.name,
    numberingDigits: normalizedTemplate.numberingDigits,
    ticketsPerPage: normalizedTemplate.ticketsPerPage,
    canvas: normalizedTemplate.canvas,
  });
}

function readImageDimensions(file) {
  return new Promise((resolve) => {
    const objectUrl = URL.createObjectURL(file);
    const image = new window.Image();

    image.onload = () => {
      const dimensions = {
        width: image.naturalWidth || 0,
        height: image.naturalHeight || 0,
      };
      URL.revokeObjectURL(objectUrl);
      resolve(dimensions);
    };
    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      resolve({ width: 0, height: 0 });
    };
    image.src = objectUrl;
  });
}

function mapDocs(snapshot) {
  return snapshot.docs.map((documentSnapshot) => ({
    id: documentSnapshot.id,
    ...documentSnapshot.data(),
  }));
}

function Drawer({ title, eyebrow, headerAction, open, onClose, children }) {
  if (!open) return null;

  return (
    <div className="drawer-backdrop" role="presentation" onMouseDown={onClose}>
      <aside className="drawer-panel" role="dialog" aria-modal="true" aria-label={title} onMouseDown={(event) => event.stopPropagation()}>
        <header className="drawer-head">
          <div>
            <span>{eyebrow}</span>
            <strong>{title}</strong>
          </div>
          <div className="drawer-head-actions">
            {headerAction}
            <button className="drawer-close" onClick={onClose} aria-label="Fermer">
              <CloseIcon fontSize="small" />
            </button>
          </div>
        </header>
        <div className="drawer-body">{children}</div>
      </aside>
    </div>
  );
}

function ConfirmModal({ isDeleting, onCancel, onConfirm, template }) {
  if (!template) return null;

  return (
    <div className="confirm-backdrop" role="presentation" onMouseDown={onCancel}>
      <section className="confirm-modal" role="dialog" aria-modal="true" aria-label="Confirmer la suppression" onMouseDown={(event) => event.stopPropagation()}>
        <span>Suppression</span>
        <h2>Supprimer ce modèle ?</h2>
        <p>
          Le modèle <strong>{template.name}</strong> sera retiré de la liste des modèles enregistrés. Les anciens lots déjà générés ne seront pas modifiés.
        </p>
        <div>
          <button className="ghost-button" disabled={isDeleting} onClick={onCancel}>
            Annuler
          </button>
          <button className="danger-button" disabled={isDeleting} onClick={onConfirm}>
            {isDeleting ? "Suppression..." : "Supprimer"}
          </button>
        </div>
      </section>
    </div>
  );
}

function OperationToast({ status, onClose }) {
  if (!status.message) return null;

  const isSuccess = status.type === "success";

  return (
    <div className="toast-portal" role="status" aria-live="polite">
      <section className={`operation-toast ${status.type}`}>
        <div className="toast-icon" aria-hidden="true">
          {isSuccess ? "OK" : "!"}
        </div>
        <div>
          <span>{isSuccess ? "Opération réussie" : "Action à vérifier"}</span>
          <strong>{status.message}</strong>
        </div>
        <button onClick={onClose} aria-label="Fermer la notification">
          ×
        </button>
      </section>
    </div>
  );
}

function SaveStateBadge({ hasUnsavedChanges, lastSavedAt }) {
  const label = lastSavedAt ? `Dernière sauvegarde : ${lastSavedAt.toLocaleString("fr-FR")}` : "Aucune sauvegarde pour ce brouillon";

  return (
    <div className={hasUnsavedChanges ? "save-state-badge unsaved" : "save-state-badge saved"} aria-live="polite">
      <span aria-hidden="true" />
      <div>
        <strong>{hasUnsavedChanges ? "Modifications non sauvegardées" : "Tout est sauvegardé"}</strong>
        <small>{label}</small>
      </div>
    </div>
  );
}

export default function TombolaModule({ user, onBack }) {
  const [activeDrawer, setActiveDrawer] = useState(null);
  const [templateDraft, setTemplateDraft] = useState(defaultTicketTemplate);
  const [templates, setTemplates] = useState([]);
  const [batches, setBatches] = useState([]);
  const [assets, setAssets] = useState([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState("draft");
  const [batchSettings, setBatchSettings] = useState({
    quantity: 50,
    startNumber: 1,
    ticketsPerFile: 600,
  });
  const [status, setStatus] = useState({ type: "idle", message: "" });
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploadingAsset, setIsUploadingAsset] = useState(false);
  const [templateToDelete, setTemplateToDelete] = useState(null);
  const [isDeletingTemplate, setIsDeletingTemplate] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState(null);
  const [lastSavedSignature, setLastSavedSignature] = useState("");

  const selectedTemplate = useMemo(() => {
    if (selectedTemplateId === "draft") return normalizeTemplate(templateDraft);
    const foundTemplate = templates.find((template) => template.id === selectedTemplateId);
    return normalizeTemplate(foundTemplate ?? templateDraft);
  }, [selectedTemplateId, templateDraft, templates]);

  const previewNumbers = useMemo(() => {
    return createTicketNumbers(
      Number(batchSettings.startNumber),
      Math.min(Number(batchSettings.quantity) || 0, 8),
      selectedTemplate.numberingDigits
    );
  }, [batchSettings.quantity, batchSettings.startNumber, selectedTemplate.numberingDigits]);

  const templateDraftSignature = useMemo(() => createTemplateSignature(templateDraft), [templateDraft]);
  const hasUnsavedChanges = !lastSavedSignature || templateDraftSignature !== lastSavedSignature;

  const reloadTemplates = async () => {
    const templatesSnapshot = await getDocs(query(collection(db, ...templatesCollectionPath), orderBy("createdAt", "desc")));
    setTemplates(mapDocs(templatesSnapshot));
  };

  useEffect(() => {
    if (!status.message || status.type !== "success") return undefined;

    const timeoutId = window.setTimeout(() => {
      setStatus({ type: "idle", message: "" });
    }, 5200);

    return () => window.clearTimeout(timeoutId);
  }, [status.message, status.type]);

  useEffect(() => {
    let isMounted = true;

    async function loadTombolaData() {
      setIsLoading(true);
      setStatus({ type: "idle", message: "" });

      try {
        const [templatesSnapshot, batchesSnapshot, assetsSnapshot] = await Promise.all([
          getDocs(query(collection(db, ...templatesCollectionPath), orderBy("createdAt", "desc"))),
          getDocs(query(collection(db, ...batchesCollectionPath), orderBy("createdAt", "desc"))),
          getDocs(query(collection(db, ...assetsCollectionPath), orderBy("createdAt", "desc"))),
        ]);

        if (!isMounted) return;

        setTemplates(mapDocs(templatesSnapshot));
        setBatches(mapDocs(batchesSnapshot));
        setAssets(mapDocs(assetsSnapshot));
      } catch (error) {
        if (!isMounted) return;
        setStatus({
          type: "error",
          message: `Chargement impossible : ${error.message}`,
        });
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    loadTombolaData();

    return () => {
      isMounted = false;
    };
  }, []);

  const updateTemplateField = (event) => {
    const { name, value } = event.target;

    if (["canvasWidthCm", "canvasHeightCm", "canvasBackgroundColor"].includes(name)) {
      setTemplateDraft((currentTemplate) => {
        const currentCanvas = normalizeTemplate(currentTemplate).canvas;
        const widthCm = name === "canvasWidthCm" ? Number(value) : currentCanvas.widthCm;
        const heightCm = name === "canvasHeightCm" ? Number(value) : currentCanvas.heightCm;

        return {
          ...currentTemplate,
          canvas: {
            ...currentCanvas,
            widthCm,
            heightCm,
            width: Math.max(100, Math.round(widthCm * 100)),
            height: Math.max(100, Math.round(heightCm * 100)),
            backgroundColor: name === "canvasBackgroundColor" ? value : currentCanvas.backgroundColor,
          },
        };
      });
      return;
    }

    setTemplateDraft((currentTemplate) =>
      syncTemplateFromLegacyFields({
        ...currentTemplate,
        [name]: ["numberingDigits", "ticketsPerPage"].includes(name) ? Number(value) : value,
      })
    );
  };

  const updateBatchField = (event) => {
    const { name, value } = event.target;
    setBatchSettings((currentSettings) => ({
      ...currentSettings,
      [name]: Number(value),
    }));
  };

  const saveTemplate = async (event) => {
    event.preventDefault();
    setIsSaving(true);
    setStatus({ type: "idle", message: "" });

    try {
      const payload = {
        ...normalizeTemplate(templateDraft),
        createdAt: serverTimestamp(),
        createdBy: createUserSnapshot(user),
      };
      const docRef = await addDoc(collection(db, ...templatesCollectionPath), payload);
      const savedAt = new Date();
      const savedTemplate = { id: docRef.id, ...payload, createdAt: savedAt };

      setTemplates((currentTemplates) => [savedTemplate, ...currentTemplates]);
      setSelectedTemplateId(docRef.id);
      setLastSavedAt(savedAt);
      setLastSavedSignature(createTemplateSignature(payload));
      setStatus({
        type: "success",
        message: "Modèle de ticket enregistré.",
      });
      setActiveDrawer(null);
    } catch (error) {
      setStatus({
        type: "error",
        message: `Enregistrement impossible : ${error.message}`,
      });
    } finally {
      setIsSaving(false);
    }
  };

  const loadSavedTemplateAsDraft = (template) => {
    const normalizedTemplate = normalizeTemplate(template);
    setTemplateDraft(normalizedTemplate);
    setSelectedTemplateId(template.id);
    setLastSavedAt(typeof template.createdAt?.toDate === "function" ? template.createdAt.toDate() : null);
    setLastSavedSignature(createTemplateSignature(normalizedTemplate));
    setActiveDrawer("templates");
  };

  const deleteTemplate = async () => {
    if (!templateToDelete?.id) {
      setStatus({
        type: "error",
        message: "Suppression annulée : identifiant du modèle introuvable.",
      });
      setTemplateToDelete(null);
      return;
    }

    setIsDeletingTemplate(true);
    setStatus({ type: "idle", message: "" });

    try {
      const deletedTemplateName = templateToDelete.name;
      await deleteDoc(doc(db, ...templatesCollectionPath, templateToDelete.id));
      await reloadTemplates();

      if (selectedTemplateId === templateToDelete.id) {
        setSelectedTemplateId("draft");
      }

      setStatus({
        type: "success",
        message: `Modèle supprimé : ${deletedTemplateName}.`,
      });
      setTemplateToDelete(null);
    } catch (error) {
      setStatus({
        type: "error",
        message: `Suppression impossible : ${error.message}`,
      });
    } finally {
      setIsDeletingTemplate(false);
    }
  };

  const generateBatch = async () => {
    const quantity = Number(batchSettings.quantity);
    const startNumber = Number(batchSettings.startNumber);
    const ticketsPerFile = Number(batchSettings.ticketsPerFile);

    if (!quantity || quantity < 1 || !startNumber || startNumber < 1 || !ticketsPerFile || ticketsPerFile < 1) {
      setStatus({
        type: "error",
        message: "Indique une quantité, un numéro de départ et une taille de fichier valides.",
      });
      return;
    }

    setIsSaving(true);
    setStatus({ type: "idle", message: "" });

    try {
      const printableWindow = window.open("", "_blank");

      if (!printableWindow) {
        throw new Error("La fenêtre d'impression a été bloquée par le navigateur.");
      }

      printableWindow.document.write(`
        <!doctype html>
        <html lang="fr">
          <head>
            <meta charset="utf-8">
            <title>Generation des tickets</title>
          </head>
          <body style="font-family: Arial, sans-serif; padding: 24px;">
            Préparation du PDF...
          </body>
        </html>
      `);
      printableWindow.document.close();

      const endNumber = startNumber + quantity - 1;
      const printChunks = createTicketPrintChunks({ quantity, startNumber, ticketsPerFile });
      const payload = {
        templateId: selectedTemplateId,
        templateName: selectedTemplate.name,
        quantity,
        startNumber,
        endNumber,
        ticketsPerFile,
        fileCount: printChunks.length,
        numberingDigits: selectedTemplate.numberingDigits,
        createdAt: serverTimestamp(),
        createdBy: createUserSnapshot(user),
      };

      await addDoc(collection(db, ...batchesCollectionPath), payload);
      setBatches((currentBatches) => [{ id: crypto.randomUUID(), ...payload, createdAt: null }, ...currentBatches]);

      if (printChunks.length > 1) {
        openTicketsPrintCenter({
          printableWindow,
          template: selectedTemplate,
          quantity,
          startNumber,
          ticketsPerFile,
        });
      } else {
        openTicketsPrintWindow({
          printableWindow,
          template: selectedTemplate,
          quantity,
          startNumber,
        });
      }

      setStatus({
        type: "success",
        message:
          printChunks.length > 1
            ? `Série ${startNumber} à ${endNumber} préparée en ${printChunks.length} fichiers. Ouvre chaque plage depuis la fenêtre de génération.`
            : `Série ${startNumber} à ${endNumber} générée. Choisis "Enregistrer en PDF" dans la fenêtre d'impression.`,
      });
      setActiveDrawer("history");
    } catch (error) {
      setStatus({
        type: "error",
        message: `Generation impossible : ${error.message}`,
      });
    } finally {
      setIsSaving(false);
    }
  };

  const uploadAsset = async (file) => {
    if (!file) return null;

    if (!file.type.startsWith("image/")) {
      setStatus({
        type: "error",
        message: "Le fichier doit être une image.",
      });
      return null;
    }

    setIsUploadingAsset(true);
    setStatus({ type: "idle", message: "" });

    try {
      const dimensions = await readImageDimensions(file);
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "-");
      const storagePath = `tombola/assets/${user.uid}/${Date.now()}-${safeName}`;
      const imageRef = ref(storage, storagePath);
      await uploadBytes(imageRef, file, {
        contentType: file.type,
        customMetadata: {
          uploadedBy: user.uid,
        },
      });
      const url = await getDownloadURL(imageRef);
      const payload = {
        name: file.name,
        url,
        storagePath,
        contentType: file.type,
        size: file.size,
        width: dimensions.width,
        height: dimensions.height,
        aspectRatio: dimensions.width && dimensions.height ? dimensions.width / dimensions.height : 1,
        createdAt: serverTimestamp(),
        createdBy: createUserSnapshot(user),
      };
      const docRef = await addDoc(collection(db, ...assetsCollectionPath), payload);
      const savedAsset = { id: docRef.id, ...payload, createdAt: null };
      setAssets((currentAssets) => [savedAsset, ...currentAssets]);
      setStatus({
        type: "success",
        message: "Image importée dans la bibliothèque.",
      });
      return savedAsset;
    } catch (error) {
      setStatus({
        type: "error",
        message: `Upload impossible : ${error.message}`,
      });
      return null;
    } finally {
      setIsUploadingAsset(false);
    }
  };

  const deleteAsset = async (asset) => {
    if (!asset?.id) return;

    setStatus({ type: "idle", message: "" });

    try {
      await deleteDoc(doc(db, ...assetsCollectionPath, asset.id));

      if (asset.storagePath) {
        await deleteObject(ref(storage, asset.storagePath));
      }

      setAssets((currentAssets) => currentAssets.filter((currentAsset) => currentAsset.id !== asset.id));
      setTemplateDraft((currentTemplate) => {
        const currentCanvas = normalizeTemplate(currentTemplate).canvas;

        return {
          ...currentTemplate,
          canvas: {
            ...currentCanvas,
            objects: currentCanvas.objects.filter((object) => object.assetId !== asset.id),
          },
        };
      });
      setStatus({
        type: "success",
        message: "Image supprimée de la bibliothèque.",
      });
    } catch (error) {
      setStatus({
        type: "error",
        message: `Suppression de l'image impossible : ${error.message}`,
      });
    }
  };

  return (
    <section className="tombola-module">
      <OperationToast status={status} onClose={() => setStatus({ type: "idle", message: "" })} />

      <div className="module-head compact-module-head">
        <button className="ghost-button back-button" onClick={onBack}>
          Retour
        </button>
        <div>
          <p className="eyebrow">Module</p>
          <h1>Tombola</h1>
          <p>Prépare les modèles, génère les séries numérotées et imprime les PDF.</p>
        </div>
      </div>

      <div className="module-action-grid">
        <button className="module-action-card" onClick={() => setActiveDrawer("templates")}>
          <span>01</span>
          <strong>Modèles de tickets</strong>
          <small>Configurer le design, les textes, le prix et les visuels.</small>
        </button>
        <button className="module-action-card" onClick={() => setActiveDrawer("savedTemplates")}>
          <span>02</span>
          <strong>Modèles enregistrés</strong>
          <small>Reprendre, consulter ou supprimer les modèles sauvegardés.</small>
        </button>
        <button className="module-action-card" onClick={() => setActiveDrawer("generate")}>
          <span>03</span>
          <strong>Générer une série</strong>
          <small>Choisir la quantité, le premier numéro et produire le PDF.</small>
        </button>
        <button className="module-action-card" onClick={() => setActiveDrawer("history")}>
          <span>04</span>
          <strong>Historique</strong>
          <small>Retrouver les derniers lots générés pour la tombola.</small>
        </button>
      </div>

      <Drawer
        eyebrow="Tombola"
        headerAction={
          <button className="drawer-save-button" disabled={isSaving} form="ticket-template-form" type="submit">
            {isSaving ? "Enregistrement..." : "Enregistrer"}
          </button>
        }
        title="Modèles de tickets"
        open={activeDrawer === "templates"}
        onClose={() => setActiveDrawer(null)}
      >
        <div className="template-designer-shell">
          <form className="tombola-form template-settings-panel" id="ticket-template-form" onSubmit={saveTemplate}>
            <SaveStateBadge hasUnsavedChanges={hasUnsavedChanges} lastSavedAt={lastSavedAt} />

            <section className="form-block model-block">
              <div className="form-block-title">
                <span>01</span>
                <strong>Modèle</strong>
              </div>
              <label>
                Nom du modèle
                <input name="name" value={templateDraft.name} onChange={updateTemplateField} required />
              </label>
            </section>

            <section className="form-block format-block">
              <div className="form-block-title">
                <span>02</span>
                <strong>Format</strong>
              </div>
              <label>
                Largeur du ticket (cm)
                <input
                  min="4"
                  name="canvasWidthCm"
                  step="0.1"
                  type="number"
                  value={normalizeTemplate(templateDraft).canvas.widthCm}
                  onChange={updateTemplateField}
                />
              </label>
              <label>
                Hauteur du ticket (cm)
                <input
                  min="2"
                  name="canvasHeightCm"
                  step="0.1"
                  type="number"
                  value={normalizeTemplate(templateDraft).canvas.heightCm}
                  onChange={updateTemplateField}
                />
              </label>
              <label>
                Couleur de fond
                <input
                  name="canvasBackgroundColor"
                  value={normalizeTemplate(templateDraft).canvas.backgroundColor}
                  onChange={updateTemplateField}
                  placeholder="#ffffff"
                />
              </label>
            </section>

            <section className="form-block numbering-block">
              <div className="form-block-title">
                <span>03</span>
                <strong>Numérotation</strong>
              </div>
              <label>
                Nombre de chiffres du numéro
                <input min="2" max="8" name="numberingDigits" type="number" value={templateDraft.numberingDigits} onChange={updateTemplateField} />
                <small className="field-help">Exemple : 4 affiche N°0001, 5 affiche N°00001.</small>
              </label>
              <label>
                Tickets par page
                <input min="1" max="6" name="ticketsPerPage" type="number" value={templateDraft.ticketsPerPage} onChange={updateTemplateField} />
              </label>
            </section>

            <button className="primary-button" disabled={isSaving}>
              {isSaving ? "Enregistrement..." : "Enregistrer le modèle"}
            </button>
          </form>

          <div className="drawer-preview canvas-drawer-preview template-canvas-workspace">
            <TicketCanvasEditor
              assets={assets}
              isUploadingAsset={isUploadingAsset}
              onChange={setTemplateDraft}
              onDeleteAsset={deleteAsset}
              onUploadAsset={uploadAsset}
              template={normalizeTemplate(templateDraft)}
            />
          </div>
        </div>
      </Drawer>

      <Drawer eyebrow="Tombola" title="Modèles enregistrés" open={activeDrawer === "savedTemplates"} onClose={() => setActiveDrawer(null)}>
        <div className="saved-template-panel">
          {isLoading ? <p className="muted-copy">Chargement...</p> : null}
          {!isLoading && templates.length === 0 ? (
            <p className="muted-copy">Aucun modèle enregistré pour le moment. Crée un design puis clique sur "Enregistrer le modèle".</p>
          ) : null}
          {templates.length > 0 ? (
            <div className="saved-template-list">
              {templates.map((template) => (
                <article key={template.id}>
                  <div>
                    <strong>{template.name}</strong>
                    <span>{resolveDate(template.createdAt) || "Date indisponible"}</span>
                  </div>
                  <p>
                    {normalizeTemplate(template).canvas.widthCm} x {normalizeTemplate(template).canvas.heightCm} cm, {template.ticketsPerPage} tickets par page
                  </p>
                  <footer>
                    <button className="ghost-button" onClick={() => loadSavedTemplateAsDraft(template)}>
                      Ouvrir dans l'éditeur
                    </button>
                    <button className="danger-button" onClick={() => setTemplateToDelete(template)}>
                      Supprimer
                    </button>
                  </footer>
                </article>
              ))}
            </div>
          ) : null}
        </div>
      </Drawer>

      <Drawer eyebrow="Tombola" title="Générer une série" open={activeDrawer === "generate"} onClose={() => setActiveDrawer(null)}>
        <div className="drawer-split">
          <div className="tombola-form">
            <label>
              Modèle
              <select value={selectedTemplateId} onChange={(event) => setSelectedTemplateId(event.target.value)}>
                <option value="draft">Brouillon actuel</option>
                {templates.map((template) => (
                  <option key={template.id} value={template.id}>
                    {template.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Quantité
              <input min="1" name="quantity" type="number" value={batchSettings.quantity} onChange={updateBatchField} />
            </label>
            <label>
              Premier numéro
              <input min="1" name="startNumber" type="number" value={batchSettings.startNumber} onChange={updateBatchField} />
            </label>
            <label>
              Tickets par fichier PDF
              <input min="1" name="ticketsPerFile" type="number" value={batchSettings.ticketsPerFile} onChange={updateBatchField} />
            </label>

            <div className="number-preview">
              {previewNumbers.map((ticket) => (
                <span key={ticket.value}>{ticket.label}</span>
              ))}
            </div>

            <button className="primary-button" disabled={isSaving} onClick={generateBatch}>
              {isSaving ? "Génération..." : "Générer le PDF"}
            </button>
          </div>

          <div className="drawer-preview">
            <TicketCanvasPreview template={selectedTemplate} number={batchSettings.startNumber} />
          </div>
        </div>
      </Drawer>

      <Drawer eyebrow="Tombola" title="Historique des lots" open={activeDrawer === "history"} onClose={() => setActiveDrawer(null)}>
        <div className="history-panel">
          {isLoading ? <p className="muted-copy">Chargement...</p> : null}
          {!isLoading && batches.length === 0 ? (
            <p className="muted-copy">Aucun lot généré pour le moment.</p>
          ) : null}
          {batches.length > 0 ? (
            <div className="history-list">
              {batches.map((batch) => (
                <article key={batch.id}>
                  <div>
                    <strong>{batch.templateName}</strong>
                    <span>{resolveDate(batch.createdAt) || "À l'instant"}</span>
                  </div>
                  <p>
                    {batch.quantity} tickets, du N°
                    {String(batch.startNumber).padStart(batch.numberingDigits, "0")} au N°
                    {String(batch.endNumber).padStart(batch.numberingDigits, "0")}
                  </p>
                </article>
              ))}
            </div>
          ) : null}
        </div>
      </Drawer>

      <ConfirmModal
        isDeleting={isDeletingTemplate}
        onCancel={() => setTemplateToDelete(null)}
        onConfirm={deleteTemplate}
        template={templateToDelete}
      />
    </section>
  );
}
