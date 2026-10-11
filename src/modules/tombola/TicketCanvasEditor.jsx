import { useCallback, useEffect, useRef, useState } from "react";
import { Circle, Group, Image, Layer, Line, Rect, Stage, Text, Transformer } from "react-konva";
import { formatTicketNumber } from "./ticketModel";
import { createTextEffectPatch, getTextRenderProps, textEffectOptions, textFontOptions } from "./textStyles";
import useCanvasImage from "./useCanvasImage";

function CanvasImageObject({ object, isSelected, onChange, onSelect }) {
  const image = useCanvasImage(object.src);
  const shapeRef = useRef(null);
  const transformerRef = useRef(null);

  useEffect(() => {
    if (isSelected && transformerRef.current && shapeRef.current) {
      transformerRef.current.nodes([shapeRef.current]);
      transformerRef.current.getLayer().batchDraw();
    }
  }, [isSelected]);

  return (
    <>
      <Image
        draggable
        height={object.height}
        image={image}
        onClick={onSelect}
        onDragEnd={(event) => onChange({ ...object, x: event.target.x(), y: event.target.y() })}
        onTap={onSelect}
        onTransformEnd={() => {
          const node = shapeRef.current;
          const scaleX = node.scaleX();
          const scaleY = node.scaleY();
          const nextScale = Math.max(scaleX, scaleY);
          node.scaleX(1);
          node.scaleY(1);
          onChange({
            ...object,
            x: node.x(),
            y: node.y(),
            width: Math.max(12, node.width() * nextScale),
            height: Math.max(12, node.height() * nextScale),
          });
        }}
        ref={shapeRef}
        width={object.width}
        x={object.x}
        y={object.y}
      />
      {isSelected ? (
        <Transformer
          anchorFill="#ffffff"
          anchorSize={9}
          anchorStroke="#35b8ce"
          borderDash={[6, 4]}
          borderStroke="#35b8ce"
          borderStrokeWidth={2}
          keepRatio
          ref={transformerRef}
          rotateEnabled={false}
        />
      ) : null}
    </>
  );
}

function CanvasTextObject({ object, isSelected, numberLabel, onChange, onSelect }) {
  const shapeRef = useRef(null);
  const transformerRef = useRef(null);
  const textRenderProps = getTextRenderProps(object);
  const textValue = object.type === "number" ? numberLabel : object.text;
  const textLayoutProps = {
    align: object.align || "left",
    fontSize: object.fontSize || 24,
    fontStyle: [object.fontVariant === "bold" ? "bold" : "", object.fontStyle === "italic" ? "italic" : ""].filter(Boolean).join(" "),
    text: textValue,
    width: object.width || 220,
    x: object.x,
    y: object.y,
  };
  const hasVisibleHalo = Number(object.shadowBlur || 0) > 0 && Boolean(object.shadowColor);

  useEffect(() => {
    if (isSelected && transformerRef.current && shapeRef.current) {
      transformerRef.current.nodes([shapeRef.current]);
      transformerRef.current.getLayer().batchDraw();
    }
  }, [isSelected]);

  return (
    <>
      {hasVisibleHalo ? (
        <Text
          {...textLayoutProps}
          fill={object.shadowColor}
          fontFamily={textRenderProps.fontFamily}
          listening={false}
          opacity={Math.max(0.2, Math.min(0.5, textRenderProps.shadowOpacity * 0.42))}
          shadowBlur={Math.min(28, Number(object.shadowBlur || 0))}
          shadowColor={object.shadowColor}
          shadowOpacity={textRenderProps.shadowOpacity}
          stroke={object.shadowColor}
          strokeWidth={Math.max(2, Math.min(18, Number(object.shadowBlur || 0) / 3))}
        />
      ) : null}
      <Text
        {...textLayoutProps}
        draggable
        onClick={onSelect}
        onDragEnd={(event) => onChange({ ...object, x: event.target.x(), y: event.target.y() })}
        onTap={onSelect}
        onTransformEnd={() => {
          const node = shapeRef.current;
          const scaleX = node.scaleX();
          node.scaleX(1);
          onChange({
            ...object,
            x: node.x(),
            y: node.y(),
            width: Math.max(40, node.width() * scaleX),
          });
        }}
        ref={shapeRef}
        {...textRenderProps}
      />
      {isSelected ? (
        <Transformer
          anchorFill="#ffffff"
          anchorSize={9}
          anchorStroke="#35b8ce"
          borderDash={[6, 4]}
          borderStroke="#35b8ce"
          borderStrokeWidth={2}
          enabledAnchors={["middle-left", "middle-right"]}
          ref={transformerRef}
          rotateEnabled={false}
        />
      ) : null}
    </>
  );
}

function CanvasLineObject({ object, isSelected, onChange, onSelect }) {
  const groupRef = useRef(null);
  const isShiftPressedRef = useRef(false);
  const resizeBaseRef = useRef(null);
  const [x1 = 0, y1 = 0, x2 = 120, y2 = 0] = object.points || [];
  const length = Math.max(12, Math.hypot(x2 - x1, y2 - y1));
  const normalizedRotation = (object.rotation || 0) + (Math.atan2(y2 - y1, x2 - x1) * 180) / Math.PI;
  const selectionX = -6;
  const selectionY = -6;
  const selectionWidth = length + 12;
  const selectionHeight = 12;
  const rotateHandleX = length / 2;
  const rotateHandleY = -34;

  useEffect(() => {
    if (!isSelected) return undefined;

    const handleKeyDown = (event) => {
      if (event.key === "Shift") isShiftPressedRef.current = true;
    };
    const handleKeyUp = (event) => {
      if (event.key === "Shift") isShiftPressedRef.current = false;
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);

    return () => {
      isShiftPressedRef.current = false;
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, [isSelected]);

  const setCursor = (event, cursor) => {
    const stage = event.target.getStage();
    if (stage) stage.container().style.cursor = cursor;
  };

  const resetCursor = (event) => {
    const stage = event.target.getStage();
    if (stage) stage.container().style.cursor = "default";
  };

  const startHandleDrag = (event) => {
    event.cancelBubble = true;
    groupRef.current?.draggable(false);
    resizeBaseRef.current = {
      x: object.x,
      y: object.y,
      length,
      rotation: normalizedRotation,
    };
  };

  const stopHandleDrag = (event) => {
    event.cancelBubble = true;
    groupRef.current?.draggable(true);
    resizeBaseRef.current = null;
    resetCursor(event);
  };

  const updateEndLength = (event) => {
    event.cancelBubble = true;
    const base = resizeBaseRef.current;
    if (!base) return;
    const nextLength = Math.max(12, event.target.x());

    onChange({
      ...object,
      x: base.x,
      y: base.y,
      rotation: base.rotation,
      points: [0, 0, nextLength, 0],
    });
  };

  const updateStartLength = (event) => {
    event.cancelBubble = true;
    const base = resizeBaseRef.current;
    if (!base) return;
    const delta = Math.min(base.length - 12, event.target.x());
    const radians = (base.rotation * Math.PI) / 180;

    onChange({
      ...object,
      x: base.x + Math.cos(radians) * delta,
      y: base.y + Math.sin(radians) * delta,
      rotation: base.rotation,
      points: [0, 0, Math.max(12, base.length - delta), 0],
    });
  };

  const rotateFromHandle = (event) => {
    event.cancelBubble = true;
    const handleX = event.target.x();
    const handleY = event.target.y();
    const centerX = length / 2;
    const centerY = 0;
    const angle = Math.atan2(handleY - centerY, handleX - centerX) * (180 / Math.PI) + 90;
    const rotation = isShiftPressedRef.current ? Math.round(angle / 90) * 90 : angle;
    onChange({
      ...object,
      points: [0, 0, length, 0],
      rotation,
    });
  };

  return (
    <>
      <Group
        draggable
        onClick={onSelect}
        onDragEnd={(event) =>
          onChange({
            ...object,
            x: event.target.x(),
            y: event.target.y(),
            rotation: normalizedRotation,
            points: [0, 0, length, 0],
          })
        }
        onTap={onSelect}
        ref={groupRef}
        rotation={normalizedRotation}
        x={object.x}
        y={object.y}
      >
        <Line
          dash={object.dash}
          hitStrokeWidth={18}
          onClick={onSelect}
          onTap={onSelect}
          points={[0, 0, length, 0]}
          stroke={object.stroke || "#111827"}
          strokeWidth={object.strokeWidth || 2}
        />
        {isSelected ? (
          <>
            <Rect
              dash={[6, 4]}
              height={selectionHeight}
              stroke="#35b8ce"
              strokeWidth={2}
              width={selectionWidth}
              x={selectionX}
              y={selectionY}
            />
            <Circle fill="#35b8ce" radius={6} x={0} y={0} />
            <Circle fill="#35b8ce" radius={6} x={length} y={0} />
            <Line points={[rotateHandleX, rotateHandleY, rotateHandleX, selectionY]} stroke="#35b8ce" strokeWidth={2} dash={[4, 4]} />
            <Circle
              draggable
              fill="#ffffff"
              onDragEnd={stopHandleDrag}
              onDragMove={rotateFromHandle}
              onDragStart={startHandleDrag}
              onMouseEnter={(event) => setCursor(event, "grab")}
              onMouseLeave={resetCursor}
              radius={9}
              stroke="#35b8ce"
              strokeWidth={3}
              x={rotateHandleX}
              y={rotateHandleY}
            />
            <Circle
              draggable
              fill="#ffffff"
              onDragEnd={stopHandleDrag}
              onDragMove={updateStartLength}
              onDragStart={startHandleDrag}
              onMouseEnter={(event) => setCursor(event, "ew-resize")}
              onMouseLeave={resetCursor}
              radius={9}
              stroke="#35b8ce"
              strokeWidth={3}
              x={0}
              y={0}
            />
            <Circle
              draggable
              fill="#ffffff"
              onDragEnd={stopHandleDrag}
              onDragMove={updateEndLength}
              onDragStart={startHandleDrag}
              onMouseEnter={(event) => setCursor(event, "ew-resize")}
              onMouseLeave={resetCursor}
              radius={9}
              stroke="#35b8ce"
              strokeWidth={3}
              x={length}
              y={0}
            />
          </>
        ) : null}
      </Group>
    </>
  );
}

function renderObject({ object, selectedId, numberLabel, updateObject, selectObject }) {
  const commonProps = {
    isSelected: selectedId === object.id,
    object,
    onChange: updateObject,
    onSelect: () => selectObject(object.id),
  };

  if (object.type === "image") return <CanvasImageObject key={object.id} {...commonProps} />;
  if (object.type === "line") return <CanvasLineObject key={object.id} {...commonProps} />;
  return <CanvasTextObject key={object.id} {...commonProps} numberLabel={numberLabel} />;
}

function ObjectDeleteModal({ object, objectLabel, onCancel, onConfirm }) {
  useEffect(() => {
    if (!object) return undefined;

    const handleKeyDown = (event) => {
      if (event.key === "Enter") onConfirm();
      if (event.key === "Escape") onCancel();
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [object, onCancel, onConfirm]);

  if (!object) return null;

  return (
    <div className="object-delete-backdrop" role="presentation" onMouseDown={onCancel}>
      <section className="object-delete-modal" role="dialog" aria-modal="true" aria-label="Confirmer la suppression" onMouseDown={(event) => event.stopPropagation()}>
        <span>Objet du ticket</span>
        <h2>Supprimer cet objet ?</h2>
        <p>
          <strong>{objectLabel}</strong> sera retiré du design. Appuie sur Entrée pour confirmer ou Échap pour annuler.
        </p>
        <div>
          <button className="ghost-button" type="button" onClick={onCancel}>
            Annuler
          </button>
          <button className="danger-button" type="button" onClick={onConfirm} autoFocus>
            Supprimer
          </button>
        </div>
      </section>
    </div>
  );
}

function AssetDeleteModal({ asset, onCancel, onConfirm }) {
  useEffect(() => {
    if (!asset) return undefined;

    const handleKeyDown = (event) => {
      if (event.key === "Enter") onConfirm();
      if (event.key === "Escape") onCancel();
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [asset, onCancel, onConfirm]);

  if (!asset) return null;

  return (
    <div className="object-delete-backdrop" role="presentation" onMouseDown={onCancel}>
      <section className="object-delete-modal" role="dialog" aria-modal="true" aria-label="Confirmer la suppression de l'image" onMouseDown={(event) => event.stopPropagation()}>
        <span>Bibliothèque</span>
        <h2>Supprimer cette image ?</h2>
        <p>
          <strong>{asset.name}</strong> sera retirée de la bibliothèque et du ticket si elle est utilisée dans ce modèle.
        </p>
        <div>
          <button className="ghost-button" type="button" onClick={onCancel}>
            Annuler
          </button>
          <button className="danger-button" type="button" onClick={onConfirm} autoFocus>
            Supprimer
          </button>
        </div>
      </section>
    </div>
  );
}

export default function TicketCanvasEditor({ assets = [], isUploadingAsset = false, onDeleteAsset, onUploadAsset, template, onChange }) {
  const [selectedId, setSelectedId] = useState(null);
  const [objectToDeleteId, setObjectToDeleteId] = useState(null);
  const [assetToDelete, setAssetToDelete] = useState(null);
  const fileInputRef = useRef(null);
  const stageRef = useRef(null);
  const canvas = template.canvas;
  const canvasPadding = 90;
  const selectedObject = canvas.objects.find((object) => object.id === selectedId);
  const objectToDelete = canvas.objects.find((object) => object.id === objectToDeleteId);
  const numberLabel = formatTicketNumber(1, template.numberingDigits);
  const scale = Math.min(0.72, 820 / (canvas.width + canvasPadding * 2), 390 / (canvas.height + canvasPadding * 2));

  const updateCanvasObjects = useCallback((objects) => {
    onChange({
      ...template,
      canvas: {
        ...canvas,
        objects,
      },
    });
  }, [canvas, onChange, template]);

  const updateObject = useCallback((nextObject) => {
    updateCanvasObjects(canvas.objects.map((object) => (object.id === nextObject.id ? nextObject : object)));
  }, [canvas.objects, updateCanvasObjects]);

  useEffect(() => {
    if (!selectedObject) return undefined;

    const editableTags = ["INPUT", "TEXTAREA", "SELECT"];
    const handleKeyDown = (event) => {
      if (!["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(event.key)) return;
      if (editableTags.includes(event.target?.tagName) || event.target?.isContentEditable) return;

      event.preventDefault();

      const step = event.shiftKey ? 10 : 1;
      const delta = {
        ArrowUp: { x: 0, y: -step },
        ArrowDown: { x: 0, y: step },
        ArrowLeft: { x: -step, y: 0 },
        ArrowRight: { x: step, y: 0 },
      }[event.key];

      updateObject({
        ...selectedObject,
        x: Math.round((Number(selectedObject.x) || 0) + delta.x),
        y: Math.round((Number(selectedObject.y) || 0) + delta.y),
      });
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedObject, updateObject]);

  const resolveObjectLabel = useCallback((object) => {
    if (object.type === "number") return `Numero (${object.id})`;
    if (object.type === "image") return `Image (${object.name || object.id})`;
    if (object.type === "line") return `Trait (${object.id})`;
    return object.text || `Texte (${object.id})`;
  }, []);

  const requestDeleteObject = useCallback((objectId = selectedId) => {
    if (!objectId) return;
    setObjectToDeleteId(objectId);
  }, [selectedId]);

  const confirmDeleteObject = useCallback(() => {
    if (!objectToDeleteId) return;
    updateCanvasObjects(canvas.objects.filter((object) => object.id !== objectToDeleteId));
    if (selectedId === objectToDeleteId) setSelectedId(null);
    setObjectToDeleteId(null);
  }, [canvas.objects, objectToDeleteId, selectedId, updateCanvasObjects]);

  const cancelDeleteObject = useCallback(() => {
    setObjectToDeleteId(null);
  }, []);

  const confirmDeleteAsset = useCallback(async () => {
    if (!assetToDelete || !onDeleteAsset) return;
    await onDeleteAsset(assetToDelete);
    setAssetToDelete(null);
  }, [assetToDelete, onDeleteAsset]);

  const cancelDeleteAsset = useCallback(() => {
    setAssetToDelete(null);
  }, []);

  useEffect(() => {
    if (!selectedObject || objectToDelete) return undefined;

    const editableTags = ["INPUT", "TEXTAREA", "SELECT"];
    const handleKeyDown = (event) => {
      if (!["Delete", "Backspace"].includes(event.key)) return;
      if (editableTags.includes(event.target?.tagName) || event.target?.isContentEditable) return;

      event.preventDefault();
      requestDeleteObject(selectedObject.id);
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [objectToDelete, requestDeleteObject, selectedObject]);

  const addObject = (type, asset = null, position = null) => {
    const id = `${type}-${crypto.randomUUID()}`;
    const imageAspectRatio = asset?.aspectRatio || (asset?.width && asset?.height ? asset.width / asset.height : 1);
    const imageWidth = asset ? 160 : 90;
    const imageHeight = Math.round(imageWidth / (imageAspectRatio || 1));
    const x = position?.x ?? 120;
    const y = position?.y ?? 120;
    const nextObject =
      type === "text"
        ? {
            id,
            type: "text",
            text: "Nouveau texte",
            x,
            y,
            width: 240,
            fontSize: 28,
            fontVariant: "bold",
            fill: "#111827",
            fontFamily: textFontOptions[0].value,
            textEffect: "none",
          }
        : type === "line"
          ? {
              id,
              type: "line",
              x,
              y: position?.y ?? 180,
              points: [0, 0, 260, 0],
              rotation: 0,
              stroke: "#111827",
              strokeWidth: 2,
            }
          : {
              id,
              type: "image",
              src: asset?.url || "/sainte-foy-logo.jpg",
              assetId: asset?.id || "",
              name: asset?.name || "Image",
              aspectRatio: imageAspectRatio,
              x,
              y,
              width: imageWidth,
              height: imageHeight,
            };

    updateCanvasObjects([...canvas.objects, nextObject]);
    setSelectedId(id);
  };

  const handleFileChange = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || !onUploadAsset) return;
    const asset = await onUploadAsset(file);
    if (asset) addObject("image", asset);
  };

  const handleAssetDrop = (event) => {
    event.preventDefault();
    const assetId = event.dataTransfer.getData("text/tombola-asset-id");
    const asset = assets.find((currentAsset) => currentAsset.id === assetId);
    const stage = stageRef.current;

    if (!asset || !stage) return;

    const stageRect = stage.container().getBoundingClientRect();
    const x = Math.round((event.clientX - stageRect.left) / scale - canvasPadding);
    const y = Math.round((event.clientY - stageRect.top) / scale - canvasPadding);

    addObject("image", asset, {
      x: Math.max(0, Math.min(canvas.width - 40, x)),
      y: Math.max(0, Math.min(canvas.height - 40, y)),
    });
  };

  const updateSelectedField = (field, value) => {
    if (!selectedObject) return;
    const nextValue =
      ["x", "y", "width", "height", "fontSize", "strokeWidth", "rotation", "shadowBlur", "shadowOffsetX", "shadowOffsetY", "shadowOpacity"].includes(field)
        ? Number(value)
        : value;
    const nextObject = {
      ...selectedObject,
      [field]: nextValue,
    };

    if (field === "shadowBlur" && Number(nextValue) > 0 && Number(selectedObject.shadowOpacity || 0) <= 0) {
      nextObject.shadowOpacity = 0.85;
    }

    if (field === "shadowColor" && value && Number(selectedObject.shadowBlur || 0) > 0 && Number(selectedObject.shadowOpacity || 0) <= 0) {
      nextObject.shadowOpacity = 0.85;
    }

    if (selectedObject.type === "image" && selectedObject.aspectRatio) {
      if (field === "width") {
        nextObject.height = Math.round(Number(nextValue) / selectedObject.aspectRatio);
      }

      if (field === "height") {
        nextObject.width = Math.round(Number(nextValue) * selectedObject.aspectRatio);
      }
    }

    updateObject({
      ...nextObject,
    });
  };

  const updateSelectedTextEffect = (effectName) => {
    if (!selectedObject) return;

    updateObject({
      ...selectedObject,
      ...createTextEffectPatch(effectName),
    });
  };

  return (
    <div className="canvas-editor">
      <div className="canvas-toolbar">
        <button type="button" onClick={() => addObject("text")}>
          Texte
        </button>
        <button type="button" onClick={() => addObject("line")}>
          Trait
        </button>
        <button type="button" onClick={() => fileInputRef.current?.click()} disabled={isUploadingAsset}>
          Image
        </button>
        <input accept="image/*" hidden onChange={handleFileChange} ref={fileInputRef} type="file" />
        <button type="button" disabled={!selectedId} onClick={() => requestDeleteObject()}>
          Supprimer
        </button>
      </div>

      <div className="canvas-editor-main">
        <div
          className="canvas-stage-shell"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setSelectedId(null);
          }}
          onDragOver={(event) => event.preventDefault()}
          onDrop={handleAssetDrop}
        >
          <Stage
            ref={stageRef}
            height={(canvas.height + canvasPadding * 2) * scale}
            onMouseDown={(event) => {
              if (event.target === event.target.getStage()) setSelectedId(null);
            }}
            scaleX={scale}
            scaleY={scale}
            width={(canvas.width + canvasPadding * 2) * scale}
          >
            <Layer>
              <Group x={canvasPadding} y={canvasPadding}>
                <Rect fill={canvas.backgroundColor || "#ffffff"} height={canvas.height} stroke="#111827" strokeWidth={2} width={canvas.width} x={0} y={0} />
                {canvas.objects.map((object) =>
                  renderObject({
                    object,
                    selectedId,
                    numberLabel,
                    updateObject,
                    selectObject: setSelectedId,
                  })
                )}
              </Group>
            </Layer>
          </Stage>
        </div>

        <aside className="object-side-panel">
          <section className="asset-library">
            <div className="asset-library-head">
              <strong>Images</strong>
              <button type="button" onClick={() => fileInputRef.current?.click()} disabled={isUploadingAsset}>
                {isUploadingAsset ? "Import..." : "Importer"}
              </button>
            </div>
            {assets.length === 0 ? (
              <p>Importe une image depuis ton ordinateur pour l'ajouter au ticket.</p>
            ) : (
              <div className="asset-grid">
                {assets.map((asset) => (
                  <article
                    draggable
                    key={asset.id}
                    onDragStart={(event) => event.dataTransfer.setData("text/tombola-asset-id", asset.id)}
                    title="Glisse l'image sur le ticket ou clique sur Ajouter"
                  >
                    <img src={asset.url} alt="" />
                    <div>
                      <span>{asset.name}</span>
                      <div className="asset-actions">
                        <button type="button" onClick={() => addObject("image", asset)}>
                          Ajouter
                        </button>
                        <button className="asset-delete-button" type="button" onClick={() => setAssetToDelete(asset)}>
                          Supprimer
                        </button>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>

          <section className="object-properties">
            <div className="object-section-head">
              <strong>Propriétés</strong>
              <button type="button" disabled={!selectedId} onClick={() => requestDeleteObject()}>
                Supprimer
              </button>
            </div>
          {!selectedObject ? <p>Sélectionne un élément sur le ticket.</p> : null}
          {selectedObject ? (
            <div className="property-grid">
              {selectedObject.type !== "number" && selectedObject.type !== "line" && selectedObject.type !== "image" ? (
                <label>
                  Texte
                  <input value={selectedObject.text || ""} onChange={(event) => updateSelectedField("text", event.target.value)} />
                </label>
              ) : null}
              {selectedObject.type === "image" ? (
                <label>
                  URL image
                  <input value={selectedObject.src || ""} onChange={(event) => updateSelectedField("src", event.target.value)} />
                </label>
              ) : null}
              <label>
                X
                <input type="number" value={Math.round(selectedObject.x)} onChange={(event) => updateSelectedField("x", event.target.value)} />
              </label>
              <label>
                Y
                <input type="number" value={Math.round(selectedObject.y)} onChange={(event) => updateSelectedField("y", event.target.value)} />
              </label>
              {selectedObject.type !== "line" ? (
                <label>
                  Largeur
                  <input type="number" value={Math.round(selectedObject.width || 0)} onChange={(event) => updateSelectedField("width", event.target.value)} />
                </label>
              ) : null}
              {selectedObject.type === "image" ? (
                <label>
                  Hauteur
                  <input type="number" value={Math.round(selectedObject.height || 0)} onChange={(event) => updateSelectedField("height", event.target.value)} />
                </label>
              ) : null}
              {["text", "number"].includes(selectedObject.type) ? (
                <>
                  <label>
                    Taille texte
                    <input type="number" value={selectedObject.fontSize || 24} onChange={(event) => updateSelectedField("fontSize", event.target.value)} />
                  </label>
                  <label>
                    Police
                    <select value={selectedObject.fontFamily || textFontOptions[0].value} onChange={(event) => updateSelectedField("fontFamily", event.target.value)}>
                      {textFontOptions.map((fontOption) => (
                        <option key={fontOption.value} value={fontOption.value}>
                          {fontOption.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Style
                    <select value={selectedObject.fontVariant || "normal"} onChange={(event) => updateSelectedField("fontVariant", event.target.value)}>
                      <option value="normal">Normal</option>
                      <option value="bold">Gras</option>
                    </select>
                  </label>
                  <label>
                    Effet
                    <select value={selectedObject.textEffect || "none"} onChange={(event) => updateSelectedTextEffect(event.target.value)}>
                      {textEffectOptions.map((effectOption) => (
                        <option key={effectOption.value} value={effectOption.value}>
                          {effectOption.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Alignement
                    <select value={selectedObject.align || "left"} onChange={(event) => updateSelectedField("align", event.target.value)}>
                      <option value="left">Gauche</option>
                      <option value="center">Centre</option>
                      <option value="right">Droite</option>
                    </select>
                  </label>
                  <label>
                    Couleur
                    <input value={selectedObject.fill || "#111827"} onChange={(event) => updateSelectedField("fill", event.target.value)} />
                  </label>
                  <label>
                    Italique
                    <input
                      checked={selectedObject.fontStyle === "italic"}
                      type="checkbox"
                      onChange={(event) => updateSelectedField("fontStyle", event.target.checked ? "italic" : "normal")}
                    />
                  </label>
                  <label>
                    Couleur contour
                    <input value={selectedObject.stroke || ""} onChange={(event) => updateSelectedField("stroke", event.target.value)} placeholder="#ffffff" />
                  </label>
                  <label>
                    Épaisseur contour
                    <input type="number" value={selectedObject.strokeWidth || 0} onChange={(event) => updateSelectedField("strokeWidth", event.target.value)} />
                  </label>
                  <label>
                    Couleur halo
                    <input value={selectedObject.shadowColor || ""} onChange={(event) => updateSelectedField("shadowColor", event.target.value)} placeholder="#d783ff" />
                  </label>
                  <label>
                    Intensité halo
                    <input min="0" max="40" type="number" value={selectedObject.shadowBlur || 0} onChange={(event) => updateSelectedField("shadowBlur", event.target.value)} />
                  </label>
                </>
              ) : null}
              {selectedObject.type === "line" ? (
                <>
                  <label>
                    Pointillé
                    <input
                      checked={Boolean(selectedObject.dash)}
                      type="checkbox"
                      onChange={(event) =>
                        updateObject({
                          ...selectedObject,
                          dash: event.target.checked ? [8, 8] : undefined,
                        })
                      }
                    />
                  </label>
                  <label>
                    Couleur
                    <input value={selectedObject.stroke || "#111827"} onChange={(event) => updateSelectedField("stroke", event.target.value)} />
                  </label>
                  <label>
                    Épaisseur
                    <input type="number" value={selectedObject.strokeWidth || 2} onChange={(event) => updateSelectedField("strokeWidth", event.target.value)} />
                  </label>
                </>
              ) : null}
            </div>
          ) : null}
          </section>

          <section className="object-layers">
            <strong>Objets du ticket</strong>
            <div className="object-layer-list">
              {canvas.objects.map((object) => (
                <div className={selectedId === object.id ? "object-layer-row active" : "object-layer-row"} key={object.id}>
                  <button className="object-layer-main" onClick={() => setSelectedId(object.id)} type="button">
                    <span className="object-type-badge">{object.type}</span>
                    <span className="object-layer-name">{resolveObjectLabel(object)}</span>
                  </button>
                  <button className="object-delete-button" onClick={() => requestDeleteObject(object.id)} type="button" aria-label={`Supprimer ${resolveObjectLabel(object)}`}>
                    ×
                  </button>
                </div>
              ))}
            </div>
          </section>
        </aside>
      </div>

      <ObjectDeleteModal
        object={objectToDelete}
        objectLabel={objectToDelete ? resolveObjectLabel(objectToDelete) : ""}
        onCancel={cancelDeleteObject}
        onConfirm={confirmDeleteObject}
      />
      <AssetDeleteModal
        asset={assetToDelete}
        onCancel={cancelDeleteAsset}
        onConfirm={confirmDeleteAsset}
      />
    </div>
  );
}
