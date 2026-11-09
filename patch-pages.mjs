import fs from 'fs';
const p = 'C:/Users/Jafar/Documents/playground/Project/lomba/src/components/pages.tsx';
let code = fs.readFileSync(p, 'utf8');
code = code.replace(/\r\n/g, '\n');

// Update imports
code = code.replace(
`import {
  grams,
  recipeUnit,
  rupiah,
  usedStockUnits,
} from "../lib/app-data";`,
`import {
  calculateProductHpp,
  grams,
  recipeUnit,
  rupiah,
  usedStockUnits,
} from "../lib/app-data";`
);

// Add History, CreditCard, ArrowUpDown to lucide-react if needed
if (!code.includes('CreditCard,')) {
  code = code.replace('Banknote,', 'Banknote,\n  CreditCard,\n  History,\n  TrendingUp,');
}

fs.writeFileSync(p, code, 'utf8');
console.log('Updated pages.tsx imports');
