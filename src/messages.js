function formatProductMessage(product, barcode) {
  return [
    `ШК: ${barcode}`,
    `Название товара: ${product.productName}`,
    `Общий остаток товара: ${product.totalStock}`,
    `Общий в т.ч. в АКЦИИ: ${product.promoStock}`,
    `Остаток склад: ${product.warehouseStock}`,
    `Каменская ост: ${product.kamenskayaStock}`,
    `Победы ост: ${product.pobedyStock}`,
    `Асбест ост: ${product.asbestStock}`,
    `Все продажи за 14 дней: ${product.sales14Days}`
  ].join('\n');
}

module.exports = { formatProductMessage };
