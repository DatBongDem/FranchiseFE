import { useResource } from "./useResource";
import { productService } from "../services/productService";
export const useProducts = () => useResource(productService.list);
