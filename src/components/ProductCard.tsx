import { ArrowUpRight, Clock3, Salad } from "lucide-react";
import type { Product } from "../types/product";
import { money } from "./ui";
import { productImageSource } from "../services/productImageService";
export default function ProductCard({
  product,
  index,
  onSelect,
}: {
  product: Product;
  index: number;
  onSelect: () => void;
}) {
  return (
    <article className="product-card">
      <div className={`product-image tone-${index % 3}`}>
        {productImageSource(product.image) ? (
          <img
            key={product.image}
            src={product.image}
            alt={product.productName}
            loading="lazy"
            onError={(e) => {
              e.currentTarget.style.display = "none";
            }}
          />
        ) : null}
        <Salad className="product-placeholder" size={88} strokeWidth={1} />
        <span className="product-category">
          {product.categoryName || "Chưa phân loại"}
        </span>
        <button
          onClick={onSelect}
          className="product-open"
          aria-label={`Chi tiết ${product.productName}`}
        >
          <ArrowUpRight size={21} />
        </button>
      </div>
      <div className="product-body">
        <div className="product-code">
          #{product.productId.slice(0, 8).toUpperCase()}
        </div>
        <h3>{product.productName}</h3>
        <div className="product-meta">
          <span>
            <Clock3 size={14} /> Hạn dùng {product.numberOfDaysToExpire || 0}{" "}
            ngày
          </span>
          <span>{product.unit || "Phần"}</span>
        </div>
        <div className="product-price">
          <strong>{money(product.sellingPrice)}</strong>
          <span>Giá bán</span>
        </div>
      </div>
    </article>
  );
}
