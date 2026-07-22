export const smartphoneBrands = [
  { name: "Samsung", logo: "samsung.png" }, { name: "Apple", logo: "apple.png" },
  { name: "Vivo", logo: "vivo.png" }, { name: "Oppo", logo: "oppo.png" },
  { name: "Realme", logo: "realme.png" }, { name: "Redmi", logo: "redmi.png" },
  { name: "OnePlus", logo: "oneplus.png" }, { name: "Nothing", logo: "nothing.png" },
];

const modelNames = {
  Samsung: ["Galaxy S25 Ultra", "Galaxy S25", "Galaxy A56 5G", "Galaxy A36 5G", "Galaxy M55", "Galaxy F16 5G"],
  Apple: ["iPhone 16 Pro Max", "iPhone 16 Pro", "iPhone 16", "iPhone 16 Plus", "iPhone 15", "iPhone 15 Plus"],
  Vivo: ["X200 Pro", "X200", "V50 5G", "V50e", "T4 5G", "Y39 5G"],
  Oppo: ["Find X8 Pro", "Find X8", "Reno 14 Pro", "Reno 14", "F29 Pro 5G", "K13 5G"],
  Realme: ["GT 7 Pro", "GT 7", "P3 Ultra", "P3 Pro", "14 Pro+", "Narzo 80 Pro"],
  Redmi: ["Note 14 Pro+", "Note 14 Pro", "Note 14", "13 5G", "A4 5G", "K50i"],
  OnePlus: ["13", "13R", "Nord 5", "Nord CE 5", "Open", "12R"],
  Nothing: ["Phone (3)", "Phone (3a) Pro", "Phone (3a)", "Phone (2)", "Phone (2a) Plus", "CMF Phone 2 Pro"],
};
const ramOptions = ["4GB", "6GB", "8GB", "12GB", "16GB"];
const storageOptions = ["64GB", "128GB", "256GB", "512GB"];

export const smartphones = smartphoneBrands.flatMap((brand, brandIndex) =>
  modelNames[brand.name].map((name, index) => {
    const price = 14999 + brandIndex * 3500 + index * 7200;
    const discount = 8 + ((brandIndex + index) % 5) * 3;
    return {
      id: brandIndex * 6 + index + 1,
      brand: brand.name,
      name,
      price,
      oldPrice: Math.round(price / (1 - discount / 100)),
      discount,
      rating: Number((4.1 + ((brandIndex + index) % 8) / 10).toFixed(1)),
      reviews: 37 + (48 - (brandIndex * 6 + index)),
      ram: ramOptions[(brandIndex + index) % ramOptions.length],
      storage: storageOptions[(brandIndex * 2 + index) % storageOptions.length],
      emi: Math.ceil(price / 12),
      newest: 48 - (brandIndex * 6 + index),
      sales: 1000 - brandIndex * 53 - index * 31,
      visual: (brandIndex + index) % 4,
      stock: "In Stock",
    };
  })
);
