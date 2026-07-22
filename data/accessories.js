export const accessoryCategories = [
  { name: "Smart Watch", label: "Smart Watches" },
  { name: "Earbuds", label: "Earbuds" },
  { name: "Power Bank", label: "Power Banks" },
  { name: "Charger", label: "Chargers" },
  { name: "Cable", label: "Cables" },
  { name: "Mobile Cover", label: "Mobile Covers" },
  { name: "Tempered Glass", label: "Tempered Glass" },
  { name: "Bluetooth Speaker", label: "Bluetooth Speakers" },
];

const catalog = {
  "Smart Watch": ["Galaxy Watch Ultra", "Watch Series 10", "Watch 2 Pro", "ColorFit Pro 6", "Wave Sigma 3"],
  Earbuds: ["Galaxy Buds3 Pro", "AirPods Pro", "Buds Pro 3", "Buds Air 7", "Airdopes Supreme"],
  "Power Bank": ["20,000mAh Fast Power Bank", "MagSafe Battery Pack", "SuperVOOC Power Bank", "Pocket Power 10K", "PowerCore Slim"],
  Charger: ["45W Super Fast Charger", "20W USB-C Adapter", "65W GaN Charger", "SuperVOOC 80W Adapter", "BoostCharge Dual Port"],
  Cable: ["USB-C Braided Cable", "USB-C to Lightning Cable", "SuperVOOC Type-C Cable", "3-in-1 Charging Cable", "Duraflex Type-C Cable"],
  "Mobile Cover": ["Silicone MagSafe Case", "Clear Shield Case", "Aramid Fiber Case", "Rugged Armor Cover", "Crystal Clear Cover"],
  "Tempered Glass": ["Ultra Clear Screen Guard", "Ceramic Shield Protector", "Privacy Glass Pro", "Edge-to-Edge Glass", "Camera Lens Protector"],
  "Bluetooth Speaker": ["JBL Flip 7", "Stone 1200", "SoundDrum P", "SoundLink Flex", "Roar 2 Speaker"],
};
const brands = ["Samsung", "Apple", "OnePlus", "Realme", "Vivo", "Oppo", "Nothing", "Redmi", "boAt", "Noise", "JBL", "Portronics"];

export const accessories = accessoryCategories.flatMap((category, categoryIndex) =>
  catalog[category.name].map((name, index) => {
    const price = 699 + categoryIndex * 330 + index * 740;
    const discount = 10 + ((categoryIndex + index) % 5) * 4;
    return {
      id: categoryIndex * 5 + index + 1,
      category: category.name,
      brand: brands[(categoryIndex * 2 + index) % brands.length],
      name,
      price,
      oldPrice: Math.round(price / (1 - discount / 100)),
      discount,
      rating: Number((4.1 + ((categoryIndex + index) % 8) / 10).toFixed(1)),
      reviews: 42 + categoryIndex * 13 + index * 9,
      newest: 40 - (categoryIndex * 5 + index),
      visual: (categoryIndex + index) % 4,
      badge: index === 0 ? "BEST SELLER" : index === 1 ? "NEW" : `${discount}% OFF`,
    };
  })
);
