/** Utilitários de data (UTC, somente data) para as agregações. */
export const MESES = ["jan","fev","mar","abr","mai","jun","jul","ago","set","out","nov","dez"];

export const ymd = (d: Date): string => d.toISOString().slice(0, 10);

export function hoje(): Date {
  const n = new Date();
  return new Date(Date.UTC(n.getUTCFullYear(), n.getUTCMonth(), n.getUTCDate()));
}
export const inicioMes = (d: Date): Date =>
  new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1));

/** Retorna o início do mês deslocado em `m` meses (m pode ser negativo). */
export const somaMeses = (d: Date, m: number): Date =>
  new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + m, 1));

export const somaDias = (d: Date, n: number): Date => {
  const x = new Date(d);
  x.setUTCDate(x.getUTCDate() + n);
  return x;
};

/** Último dia do mês de `d`. */
export const fimMes = (d: Date): Date => somaDias(somaMeses(d, 1), -1);

/** Segunda-feira da semana de `d`. */
export const inicioSemana = (d: Date): Date => somaDias(d, -((d.getUTCDay() + 6) % 7));