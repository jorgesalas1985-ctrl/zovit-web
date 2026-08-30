import { PAYMENT_PROCESSING_TERMS_NOTE } from "@/lib/payments/receiptCopy";

export default function TermsPage() {
  return (
    <main className="simplePage">
      <article className="moduleCard legalDocumentPage">
        <p className="kicker">NORMATIVA ZOVIT</p>
        <h1>Términos y condiciones</h1>
        <p>Al crear una cuenta, la persona declara haber leído y aceptado esta normativa.</p>
        <h2>Declaración electrónica de adhesión</h2>
        <p>La aceptación realizada durante el registro constituye una declaración electrónica asociada a la cuenta, su fecha de aceptación y la versión vigente de estos términos.</p>
        <h2>Pagos dentro de ZOVIT</h2>
        <p>Los servicios deben coordinarse y pagarse únicamente mediante los medios electrónicos habilitados en la plataforma.</p>
        <h2>Procesamiento del medio de pago</h2>
        <p>{PAYMENT_PROCESSING_TERMS_NOTE}</p>
        <p>Cuando el pago sea con débito, el costo de procesamiento podrá estar incorporado en el valor total mostrado como Servicio, sin alterar el total informado al cliente. El detalle permanece registrado internamente para conciliación contable.</p>
        <h2>Tarjetas de crédito</h2>
        <p>Las cuotas, intereses, promociones y condiciones de la tarjeta son informadas y gestionadas por Mercado Pago y la entidad emisora antes de confirmar el pago.</p>
        <h2>Comprobantes y documentos tributarios</h2>
        <p>La boleta o factura refleja los conceptos tributarios correspondientes al servicio y a ZOVIT. Los costos del procesador de pago permanecen registrados internamente para conciliación contable.</p>
      </article>
    </main>
  );
}
