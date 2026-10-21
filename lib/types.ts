export type Category = {
  id: string;
  name: string;
  slug: string;
  sort_order: number;
};

export type Product = {
  id: string;
  category_id: string;
  name: string;
  description: string;
  ingredients: string;
  details: string;
  price: number;
  image_path: string | null;
  video_path?: string | null;
  is_available: boolean;
  sort_order: number;
  categories?: { name: string; slug: string } | null;
};
