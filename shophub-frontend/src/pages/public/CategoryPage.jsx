import { useParams } from 'react-router-dom'
import ProductListPage from './ProductListPage'

export default function CategoryPage() {
  const { slug } = useParams()
  return <ProductListPage categorySlug={slug} />
}