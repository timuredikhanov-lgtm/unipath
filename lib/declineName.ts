import { inclineFirstname, getFirstnameGender } from "lvovich";

type Padezh = "genitive" | "dative" | "accusative" | "instrumental" | "prepositional";

// Склоняет имя по заданному падежу. При нераспознанном имени возвращает исходное.
export function declineName(name: string, padezh: Padezh): string {
  try {
    const gender = getFirstnameGender(name);
    const result = inclineFirstname(name, padezh, gender);
    return result ?? name;
  } catch {
    return name;
  }
}
