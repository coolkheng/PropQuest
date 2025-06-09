interface ListingHeaderProps {
  title: string
  resultCount: number
}

export function ListingHeader({ title, resultCount }: ListingHeaderProps) {
  return (
    <div className="mb-6">
      <h2 className="text-2xl font-bold text-gray-900 mb-2">{title}</h2>
      <p className="text-gray-600">{resultCount} results found</p>
    </div>
  )
}
