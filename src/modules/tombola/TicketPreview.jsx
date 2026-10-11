import { formatTicketNumber, normalizeTemplate } from "./ticketModel";

export default function TicketPreview({ template, number = 1 }) {
  const currentTemplate = normalizeTemplate(template);
  const ticketNumber = formatTicketNumber(number, currentTemplate.numberingDigits);

  return (
    <article className="ticket-preview">
      <section className="ticket-part ticket-public-part">
        <p className="ticket-cause">{currentTemplate.causeText}</p>
        <div className="ticket-title">
          <span>{currentTemplate.titlePrefix}</span>
          <strong>{currentTemplate.title}</strong>
        </div>
        <img className="ticket-school-logo" src={currentTemplate.schoolLogoUrl} alt="" />
        <p className="ticket-prize">{currentTemplate.prizeText}</p>
        <div className="ticket-partner">
          {currentTemplate.partnerLogoUrl ? (
            <img src={currentTemplate.partnerLogoUrl} alt="" />
          ) : (
            <strong>{currentTemplate.partnerName}</strong>
          )}
        </div>
        <div className="ticket-castle" aria-hidden="true" />
        <strong className="ticket-number">{ticketNumber}</strong>
      </section>

      <section className="ticket-part ticket-form-part">
        <div className="ticket-form-head">
          <div className="ticket-partner compact">
            {currentTemplate.partnerLogoUrl ? (
              <img src={currentTemplate.partnerLogoUrl} alt="" />
            ) : (
              <strong>{currentTemplate.partnerName}</strong>
            )}
          </div>
          <img className="ticket-school-logo compact-logo" src={currentTemplate.schoolLogoUrl} alt="" />
        </div>

        <div className="ticket-lines">
          <span>NOM :</span>
          <i />
          <span>Prénom :</span>
          <i />
          <span>Téléphone :</span>
          <i />
        </div>

        <div className="ticket-bottom">
          <strong className="ticket-number pink">{ticketNumber}</strong>
          <strong className="ticket-price">{currentTemplate.priceLabel}</strong>
        </div>
      </section>

      <span className="ticket-cut-label">Partie a deposer</span>
    </article>
  );
}
