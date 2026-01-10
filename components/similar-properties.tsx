import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export function SimilarProperties() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl bg-clip-text text-transparent bg-blue-gradient">Similar Properties</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {[1, 2, 3].map((item) => (
            <div key={item} className="flex space-x-3 p-3 border rounded-lg hover:bg-gray-50 cursor-pointer">
              <img
                src="/placeholder.svg?height=60&width=80"
                alt="Similar property"
                className="w-20 h-15 object-cover rounded"
              />
              <div className="flex-1">
                <h4 className="font-medium text-sm">Modern Condo in SS2</h4>
                <p className="text-gray-600 text-xs">2 bed • 2 bath</p>
                <p className="bg-clip-text text-transparent bg-blue-gradient font-semibold text-sm">RM 2,200/month</p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
