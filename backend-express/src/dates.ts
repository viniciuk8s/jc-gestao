/** Utilitários de data (UTC, somente data) para as agregações. */
export const MESES = ["jan","fev","mar","abr","mai","jun","jul","ago","set","out","nov","dez"];

export const ymd = (d: Date): string => d.toISOString().slice(0, 10);

/** Fuso de operação do sistema (Brasil). Ajuste aqui se a empresa mudar de praça. */
const TZ = "America/Sao_Paulo";

/** Partes Y/M/D do dia no fuso local (não em UTC). Usa Intl (ICU completo no Node 18+). */
function partesLocais(d: Date = new Date()): { y: number; m: number; dd: number } {
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit",
  });
  const parts = fmt.formatToParts(d);
  const get = (t: string): number => Number(parts.find((p) => p.type === t)?.value);
  return { y: get("year"), m: get("month"), dd: get("day") };
}

/** "Hoje" como a data do calendário no fuso local, representada à meia-noite UTC.
 *  Corrige o bug de borda de mês/semana: à noite (UTC-3) o UTC já virou o dia seguinte,
 *  o que fazia o dashboard pular para o mês/semana errado. */
export function hoje(): Date {
  const { y, m, dd } = partesLocais();
  return new Date(Date.UTC(y, m - 1, dd));
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