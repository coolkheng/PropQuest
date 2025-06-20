import { Button } from "@/components/ui/button"

export function TopBar() {
  return (
    <div className="bg-white border-b border-gray-200 px-4 py-3">
      <div className="flex items-center justify-between max-w-7xl mx-auto">
        <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 via-blue-500 to-blue-400">PropQuest</h1>
        <div className="flex items-center space-x-4">
          <Button variant="ghost" size="sm">
            Sign In
          </Button>
          <Button size="sm" className="bg-gradient-to-r from-blue-600 via-blue-500 to-blue-400 hover:opacity-90 border-0">
            Sign Up
          </Button>
        </div>
      </div>
    </div>
  )
}
