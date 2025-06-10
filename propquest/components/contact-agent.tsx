import { Phone, Mail, MessageCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

interface ContactAgentProps {
  agent: {
    name: string
    company: string
    phone: string
    email: string
  }
}

export function ContactAgent({ agent }: ContactAgentProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl bg-clip-text text-transparent bg-gradient-to-r from-blue-600 via-blue-500 to-blue-400">Contact Agent</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-center">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
            <span className="text-blue-500 font-bold text-xl">
              {agent.name
                .split(" ")
                .map((n) => n[0])
                .join("")}
            </span>
          </div>
          <h3 className="font-semibold text-gray-900">{agent.name}</h3>
          <p className="text-gray-600 text-sm">{agent.company}</p>
        </div>

        <div className="space-y-3">
          <Button className="w-full bg-gradient-to-r from-blue-600 via-blue-500 to-blue-400 hover:opacity-90 border-0">
            <Phone className="h-4 w-4 mr-2" />
            Call Now
          </Button>
          <Button variant="outline" className="w-full">
            <Mail className="h-4 w-4 mr-2" />
            Send Email
          </Button>
          <Button variant="outline" className="w-full">
            <MessageCircle className="h-4 w-4 mr-2" />
            WhatsApp
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
