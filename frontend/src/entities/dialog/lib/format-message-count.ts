const pluralRules = new Intl.PluralRules("ru-RU");

const forms: Record<Intl.LDMLPluralRule, string> = {
  zero: "сообщений",
  one: "сообщение",
  two: "сообщения",
  few: "сообщения",
  many: "сообщений",
  other: "сообщения",
};

export const formatMessageCount = (count: number) => {
  return `${count} ${forms[pluralRules.select(count)]}`;
};
