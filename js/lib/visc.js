// Viscosidade pelo modelo MYEGA (Mauro et al., PNAS 2009):
// log10 η = log10 η∞ + (12 − log10 η∞) (Tg/T) exp[(m/(12 − log10 η∞) − 1)(Tg/T − 1)]
export function myega(TK, Tg, m, logInf = -3) {
  const r = Tg / TK;
  const k = 12 - logInf;
  return logInf + k * r * Math.exp((m / k - 1) * (r - 1));
}
// vidro sodo-cálcico típico: Tg ≈ 823 K (550 °C), m ≈ 38
export const logEtaSLS = (TK) => myega(TK, 823, 38);
