import fs from 'fs';
const p = 'C:/Users/Jafar/Documents/playground/Project/lomba/src/lib/app-data.ts';
let code = fs.readFileSync(p, 'utf8');

const target = `export type Transaction = {
  id: string;
  date: string;
  type: "income" | "expense";
  title: string;
  amount: number;
  method: string;
};`;

const replacement = `export type Transaction = {
  id: string;
  date: string;
  time?: string;
  type: "income" | "expense";
  title: string;
  amount: number;
  method: string;
  category?: string;
  note?: string;
};`;

code = code.replace(/\r\n/g, '\n');
const normalizedTarget = target.replace(/\r\n/g, '\n');
if (code.includes(normalizedTarget)) {
  code = code.replace(normalizedTarget, replacement);
  fs.writeFileSync(p, code, 'utf8');
  console.log('Successfully updated Transaction type in app-data.ts');
} else {
  console.log('Target not found in app-data.ts');
}

