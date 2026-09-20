// Glosario en lenguaje cotidiano. Una sola fuente para los tooltips (<Term>) y la página /glosario.
// `short` cabe en un tooltip; `long` amplía en /glosario. Sin promesas que la app no cumple.
export type GlossaryEntry = { label: string; short: string; long: string };

export const GLOSSARY = {
  onchain: {
    label: "Onchain",
    short: "Guardado en una blockchain: un libro de registro público que nadie puede editar ni borrar después.",
    long: "\"Onchain\" significa \"en la cadena\". Es información escrita en una blockchain en lugar de en la base de datos de una empresa. Cualquiera puede consultarla y nadie, ni siquiera nosotros, puede cambiarla o borrarla. Por eso sirve como prueba: quien quiera financiarte no tiene que fiarse solo de tu palabra.",
  },
  blockchain: {
    label: "Blockchain",
    short: "Un libro de registro compartido por miles de computadoras, donde lo escrito no se puede alterar.",
    long: "Piensa en un cuaderno de cuentas que miles de computadoras copian y comparan al mismo tiempo. Para cambiar una línea habría que engañar a casi todas a la vez, y por eso lo escrito ahí se considera permanente y confiable.",
  },
  wallet: {
    label: "Billetera (wallet)",
    short: "Una app (como MetaMask) que guarda tu identidad digital y firma acciones en tu nombre.",
    long: "Es una aplicación o extensión del navegador, como MetaMask. Tiene una dirección pública (como un número de cuenta) y una clave secreta que nunca debes compartir. Cuando la app te pide \"firmar\", tu billetera te muestra qué vas a aprobar y tú decides. Boti nunca ve tu clave secreta.",
  },
  passport: {
    label: "Project Passport",
    short: "El pasaporte de tu proyecto: un registro público de tus avances, ligado a tu billetera y que no se puede transferir.",
    long: "Es una especie de credencial digital (un NFT) que representa tu proyecto. Es \"soulbound\": queda atada a tu billetera y no se puede vender ni regalar, así nadie puede comprar un historial ajeno. Certifica evidencia de avances, no identidad: no verificamos quién eres.",
  },
  soulbound: {
    label: "Soulbound",
    short: "Que no se puede transferir: queda ligado a una sola billetera.",
    long: "Un token \"soulbound\" no se puede vender, regalar ni mover a otra billetera. Es lo que evita que alguien compre el historial de otro proyecto.",
  },
  hito: {
    label: "Avance (hito)",
    short: "Algo concreto que lograste: un prototipo, una carta de intención, tus primeras ventas...",
    long: "Un hito es un logro medible de tu proyecto. Cada vez que registras uno, queda anotado en tu pasaporte con la fecha y con la huella digital de tu evidencia.",
  },
  hash: {
    label: "Huella digital (hash)",
    short: "Un código único calculado a partir de un archivo o texto. Cambia por completo si cambias una sola letra.",
    long: "Es como la huella dactilar de un documento. En la cadena guardamos solo esa huella, nunca el archivo: así tu evidencia sigue siendo privada, pero cualquiera a quien se la muestres puede calcular la huella y comprobar que coincide. Se calcula en tu navegador; el contenido no sale de tu computador.",
  },
  validador: {
    label: "Validador",
    short: "Una persona o entidad independiente que revisa tu evidencia y confirma tu avance.",
    long: "Es quien revisa la evidencia que te entrega el founder y, si coincide, marca el avance como verificado. Por regla del sistema, un validador no puede verificar un avance que él mismo registró. En esta demo hay un solo validador; en producción serían varios (por ejemplo, una firma múltiple).",
  },
  ipfs: {
    label: "IPFS",
    short: "Una red donde un archivo se identifica por su contenido, así que no se puede cambiar sin que cambie su dirección.",
    long: "En vez de guardar el nombre y la descripción de tu proyecto en un servidor que alguien pueda editar, los subimos a IPFS. La dirección del archivo (ipfs://…) depende de su contenido: si alguien lo cambiara, la dirección sería otra, y el pasaporte quedaría apuntando al original.",
  },
  micropago: {
    label: "Micropago (x402)",
    short: "Un pago muy pequeño hecho al instante, sin cuenta ni contraseña, con una billetera.",
    long: "x402 es un estándar para cobrar centavos por acceder a algo, sin registro. Aquí lo usamos de dos maneras: el agente paga por datos premium, y un financiador paga un micropago para desbloquear el reporte de verificación de un proyecto.",
  },
  testnet: {
    label: "Red de prueba (testnet)",
    short: "Una versión de práctica de la blockchain, con dinero de mentira.",
    long: "Todo lo que ves aquí ocurre en redes de prueba: las monedas no valen dinero real. Sirve para demostrar que el sistema funciona sin arriesgar fondos de nadie.",
  },
  usdcPrueba: {
    label: "USDC de prueba",
    short: "Un dólar digital de mentira, solo para practicar pagos en la red de prueba.",
    long: "USDC es una moneda digital que vale un dólar. En la red de prueba existe una versión gratuita y sin valor para practicar. Se consigue gratis en un \"faucet\".",
  },
  firmar: {
    label: "Firmar",
    short: "Aprobar una acción desde tu billetera, como confirmar un pago con tu huella en el celular.",
    long: "Cuando la app necesita escribir algo en la cadena, tu billetera te pide confirmar. Firmar no revela tu clave secreta: solo demuestra que eres tú quien aprueba.",
  },
  noDilutiva: {
    label: "Financiación no dilutiva",
    short: "Dinero que recibes sin regalar parte de tu empresa: premios, subvenciones, becas.",
    long: "A diferencia de una inversión, no entregas acciones ni porcentaje de tu empresa a cambio. Suele venir de premios, convocatorias públicas, subvenciones o programas de aceleración sin equity.",
  },
  equity: {
    label: "Equity",
    short: "Porcentaje de propiedad de una empresa. \"Sin equity\" significa que no cedes nada.",
    long: "Cuando alguien invierte a cambio de equity, se queda con una parte de tu empresa. Un programa \"sin equity\" no te pide ninguna.",
  },
  mvp: {
    label: "MVP",
    short: "La versión más simple de tu producto que ya sirve para probarlo con usuarios reales.",
    long: "Producto mínimo viable: lo justo para probar tu idea sin construirlo todo. Algunas convocatorias lo exigen para postular.",
  },
  traccion: {
    label: "Tracción",
    short: "Señales de que tu proyecto avanza: usuarios, ventas, pilotos, cartas de interés.",
    long: "Son pruebas de que a alguien le importa lo que haces: usuarios activos, ventas, pilotos con clientes o acuerdos. Los financiadores suelen pedirla.",
  },
  safe: {
    label: "SAFE",
    short: "Un acuerdo en el que recibes dinero hoy y el inversionista se convierte en dueño de una parte en el futuro.",
    long: "Es un contrato de inversión frecuente en startups. No fija el porcentaje hoy, sino que lo define en una ronda futura. Conviene leerlo con calma antes de aceptarlo.",
  },
  kyc: {
    label: "KYC",
    short: "Verificar la identidad real de una persona con documentos. Este sistema no lo hace.",
    long: "\"Conoce a tu cliente\". Bootstrap no verifica identidades: el pasaporte certifica que existe evidencia de un avance, no quién eres.",
  },
} as const satisfies Record<string, GlossaryEntry>;

export type GlossaryKey = keyof typeof GLOSSARY;
