import React from "react";
import { Navigate, useParams } from "react-router-dom";
import { useData } from "../DataContext";
import CategoryView from "../CategoryView";

export default function CategoryRoute() {
  const { slug } = useParams();
  const { categories } = useData();
  const category = categories.find((c) => c.toLowerCase() === slug);
  if (!category) return <Navigate to="/" replace />;
  return <CategoryView key={category} category={category} />;
}