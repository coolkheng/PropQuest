# PropQuest Components Documentation

This documentation provides detailed information about all reusable components in the PropQuest application.

## Table of Contents

### Shared Components
- [TopBar](#topbar)
- [FloatingSearchBar](#floatingsearchbar)
- [MapControls](#mapcontrols)
- [PropertyCard](#propertycard)
- [PropertyMarker](#propertymarker)

### Map View Components
- [MapView](#mapview)
- [AiChatPanel](#aichatpanel)

### Listing View Components
- [ListingHeader](#listingheader)
- [PropertyGrid](#propertygrid)

### Property Detail Components
- [ImageGallery](#imagegallery)
- [ListingOverview](#listingoverview)
- [PropertyDetails](#propertydetails)
- [WhatsNearby](#whatsnearby)
- [ContactAgent](#contactagent)
- [QuickStats](#quickstats)
- [Facilities](#facilities)
- [SimilarProperties](#similarproperties)

---

## Shared Components

### TopBar

The main navigation header component that appears on all pages.

#### Props
This component doesn't accept any props.

#### Usage
\`\`\`tsx
import { TopBar } from "@/components/top-bar"

export default function MyPage() {
  return (
    <div>
      <TopBar />
      {/* Rest of your page content */}
    </div>
  )
}
\`\`\`

#### Features
- PropQuest logo with blue gradient
- Sign In and Sign Up buttons
- Responsive design
- Consistent styling across all pages

---

### FloatingSearchBar

A reusable search input component with floating design and customizable styling.

#### Props
\`\`\`tsx
interface FloatingSearchBarProps {
  searchQuery: string
  onSearchChange: (value: string) => void
  placeholder?: string
  className?: string
}
\`\`\`

| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `searchQuery` | `string` | Yes | - | Current search query value |
| `onSearchChange` | `(value: string) => void` | Yes | - | Callback when search value changes |
| `placeholder` | `string` | No | `"Search properties in Petaling Jaya..."` | Input placeholder text |
| `className` | `string` | No | `""` | Additional CSS classes |

#### Usage
\`\`\`tsx
import { FloatingSearchBar } from "@/components/floating-search-bar"
import { useState } from "react"

export default function SearchPage() {
  const [searchQuery, setSearchQuery] = useState("")

  return (
    <FloatingSearchBar
      searchQuery={searchQuery}
      onSearchChange={setSearchQuery}
      placeholder="Search for properties..."
      className="my-custom-class"
    />
  )
}
\`\`\`

#### Features
- Floating design with backdrop blur
- Search icon with blue gradient background
- Responsive input field
- Customizable placeholder and styling

---

### MapControls

Navigation controls for switching between map and list views, plus filters.

#### Props
\`\`\`tsx
interface MapControlsProps {
  activeView: "map" | "list"
}
\`\`\`

| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `activeView` | `"map" \| "list"` | Yes | - | Currently active view mode |

#### Usage
\`\`\`tsx
import { MapControls } from "@/components/map-controls"

export default function MapPage() {
  return (
    <div className="relative">
      <MapControls activeView="map" />
      {/* Map content */}
    </div>
  )
}

export default function ListPage() {
  return (
    <div>
      <MapControls activeView="list" />
      {/* List content */}
    </div>
  )
}
\`\`\`

#### Features
- Map/List toggle buttons
- Active state styling
- Filters button with badge
- Absolute positioning for overlay

---

### PropertyCard

Flexible property card component that works in both small and large sizes.

#### Props
\`\`\`tsx
interface PropertyCardProps {
  property: {
    id: number
    name: string
    rating: number
    price: number
    image: string
    bestFor?: boolean
    location?: string
    amenities?: string[]
  }
  isHovered: boolean
  onMouseEnter: () => void
  onMouseLeave: () => void
  onClick: () => void
  size?: "small" | "large"
}
\`\`\`

| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `property` | `PropertyObject` | Yes | - | Property data object |
| `isHovered` | `boolean` | Yes | - | Whether card is currently hovered |
| `onMouseEnter` | `() => void` | Yes | - | Mouse enter callback |
| `onMouseLeave` | `() => void` | Yes | - | Mouse leave callback |
| `onClick` | `() => void` | Yes | - | Click callback |
| `size` | `"small" \| "large"` | No | `"small"` | Card size variant |

#### Usage
\`\`\`tsx
import { PropertyCard } from "@/components/property-card"
import { useState } from "react"

export default function PropertyList() {
  const [hoveredId, setHoveredId] = useState<number | null>(null)
  
  const property = {
    id: 1,
    name: "Beautiful Apartment",
    rating: 4.8,
    price: 2500,
    image: "/property-image.jpg",
    bestFor: true,
    location: "Petaling Jaya",
    amenities: ["WiFi", "Pool", "Gym"]
  }

  return (
    <PropertyCard
      property={property}
      isHovered={hoveredId === property.id}
      onMouseEnter={() => setHoveredId(property.id)}
      onMouseLeave={() => setHoveredId(null)}
      onClick={() => console.log("Property clicked")}
      size="large"
    />
  )
}
\`\`\`

#### Features
- Two size variants (small/large)
- Hover animations
- "Best for you" badge
- Star ratings
- Price display
- Responsive design

---

### PropertyMarker

Map marker component for displaying property prices on the map.

#### Props
\`\`\`tsx
interface PropertyMarkerProps {
  price: number
  isHovered: boolean
  position: string
}
\`\`\`

| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `price` | `number` | Yes | - | Property price to display |
| `isHovered` | `boolean` | Yes | - | Whether marker is hovered |
| `position` | `string` | Yes | - | CSS positioning classes |

#### Usage
\`\`\`tsx
import { PropertyMarker } from "@/components/property-marker"

export default function MapView() {
  return (
    <div className="relative">
      <PropertyMarker
        price={2500}
        isHovered={false}
        position="top-1/2 left-1/2"
      />
    </div>
  )
}
\`\`\`

#### Features
- Price display with currency
- Hover state scaling
- Map pin icon
- Absolute positioning

---

## Map View Components

### MapView

Complete map interface with property markers and cards.

#### Props
\`\`\`tsx
interface MapViewProps {
  properties: Property[]
  hoveredProperty: number | null
  onPropertyHover: (id: number | null) => void
  onPropertyClick: (id: number) => void
}
\`\`\`

| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `properties` | `Property[]` | Yes | - | Array of property objects |
| `hoveredProperty` | `number \| null` | Yes | - | ID of currently hovered property |
| `onPropertyHover` | `(id: number \| null) => void` | Yes | - | Property hover callback |
| `onPropertyClick` | `(id: number) => void` | Yes | - | Property click callback |

#### Usage
\`\`\`tsx
import { MapView } from "@/components/map-view"
import { useState } from "react"

export default function HomePage() {
  const [hoveredProperty, setHoveredProperty] = useState<number | null>(null)
  
  const properties = [
    {
      id: 1,
      name: "Property 1",
      rating: 4.8,
      price: 2500,
      image: "/image1.jpg"
    }
  ]

  return (
    <MapView
      properties={properties}
      hoveredProperty={hoveredProperty}
      onPropertyHover={setHoveredProperty}
      onPropertyClick={(id) => console.log(`Property ${id} clicked`)}
    />
  )
}
\`\`\`

#### Features
- Interactive map background
- Property markers with hover effects
- Property cards carousel at bottom
- Location labels
- Responsive design

---

### AiChatPanel

AI-powered chat interface for property search assistance.

#### Props
This component manages its own state and doesn't accept props.

#### Usage
\`\`\`tsx
import { AiChatPanel } from "@/components/ai-chat-panel"

export default function HomePage() {
  return (
    <div className="flex">
      {/* Map content */}
      <AiChatPanel />
    </div>
  )
}
\`\`\`

#### Features
- Chat message display
- User and AI message styling
- Feedback buttons (thumbs up/down)
- Input field with send button
- Responsive design

---

## Listing View Components

### ListingHeader

Header component for listing pages showing title and result count.

#### Props
\`\`\`tsx
interface ListingHeaderProps {
  title: string
  resultCount: number
}
\`\`\`

| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `title` | `string` | Yes | - | Page title |
| `resultCount` | `number` | Yes | - | Number of results found |

#### Usage
\`\`\`tsx
import { ListingHeader } from "@/components/listing-header"

export default function ListingPage() {
  return (
    <div>
      <ListingHeader 
        title="Properties in Petaling Jaya" 
        resultCount={46} 
      />
      {/* Property listings */}
    </div>
  )
}
\`\`\`

#### Features
- Bold title styling
- Result count display
- Consistent spacing

---

### PropertyGrid

Grid layout component for displaying property listings.

#### Props
\`\`\`tsx
interface PropertyGridProps {
  properties: Property[]
  onPropertyClick: (id: number) => void
}
\`\`\`

| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `properties` | `Property[]` | Yes | - | Array of properties to display |
| `onPropertyClick` | `(id: number) => void` | Yes | - | Property click callback |

#### Usage
\`\`\`tsx
import { PropertyGrid } from "@/components/property-grid"

export default function ListingPage() {
  const properties = [
    {
      id: 1,
      name: "Property 1",
      rating: 4.8,
      price: 2500,
      image: "/image1.jpg",
      location: "Petaling Jaya",
      amenities: ["WiFi", "Pool"]
    }
  ]

  return (
    <PropertyGrid
      properties={properties}
      onPropertyClick={(id) => console.log(`Navigate to property ${id}`)}
    />
  )
}
\`\`\`

#### Features
- Responsive grid layout
- Large property cards
- Automatic grid sizing

---

## Property Detail Components

### ImageGallery

Property image carousel with favorites and sharing functionality.

#### Props
\`\`\`tsx
interface ImageGalleryProps {
  images: string[]
  title: string
}
\`\`\`

| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `images` | `string[]` | Yes | - | Array of image URLs |
| `title` | `string` | Yes | - | Property title for alt text |

#### Usage
\`\`\`tsx
import { ImageGallery } from "@/components/property-detail/image-gallery"

export default function PropertyDetail() {
  const images = [
    "/property1.jpg",
    "/property2.jpg",
    "/property3.jpg"
  ]

  return (
    <ImageGallery 
      images={images} 
      title="Beautiful Apartment" 
    />
  )
}
\`\`\`

#### Features
- Main image display
- Thumbnail navigation
- Favorite button with state
- Share button
- Image carousel functionality

---

### ListingOverview

Property overview section with key details and pricing.

#### Props
\`\`\`tsx
interface ListingOverviewProps {
  title: string
  listingType: string
  location: string
  dateListed: string
  dateUpdated: string
  referenceNumber: string
  price: string
  priceType: string
}
\`\`\`

#### Usage
\`\`\`tsx
import { ListingOverview } from "@/components/property-detail/listing-overview"

export default function PropertyDetail() {
  return (
    <ListingOverview
      title="Beautiful Apartment"
      listingType="For Rent"
      location="SS2, Petaling Jaya"
      dateListed="2024-01-15"
      dateUpdated="2024-01-20"
      referenceNumber="PQ-001234"
      price="RM 2,100"
      priceType="per month"
    />
  )
}
\`\`\`

#### Features
- Property title and type badge
- Location with map icon
- Listing and update dates
- Reference number
- Prominent price display

---

### PropertyDetails

Detailed property specifications in a two-column layout.

#### Props
\`\`\`tsx
interface PropertyDetailsProps {
  propertyType: string
  tenure: string
  titleType: string
  landArea: string
  builtUpArea: string
  unitType: string
  pricePerSqFtBuiltUp: string
  bedrooms: number
  bathrooms: number
  parking: number
  storeys: number
  furnishing: string
}
\`\`\`

#### Usage
\`\`\`tsx
import { PropertyDetails } from "@/components/property-detail/property-details"

export default function PropertyDetail() {
  return (
    <PropertyDetails
      propertyType="Condominium"
      tenure="Leasehold"
      titleType="Individual Title"
      landArea="N/A"
      builtUpArea="850 sq ft"
      unitType="Intermediate"
      pricePerSqFtBuiltUp="RM 2.47"
      bedrooms={2}
      bathrooms={2}
      parking={1}
      storeys={1}
      furnishing="Fully Furnished"
    />
  )
}
\`\`\`

#### Features
- Two-column responsive layout
- Icons for bedrooms, bathrooms, parking
- Consistent spacing and typography

---

### WhatsNearby

Interactive nearby amenities section with map and category filtering.

#### Props
\`\`\`tsx
interface WhatsNearbyProps {
  amenities: {
    foodAndDrink: Array<{ name: string; time: string; distance: string }>
    schools: string[]
    shopping: string[]
    medical: string[]
    publicTransport: string[]
  }
}
\`\`\`

#### Usage
\`\`\`tsx
import { WhatsNearby } from "@/components/property-detail/whats-nearby"

export default function PropertyDetail() {
  const amenities = {
    foodAndDrink: [
      { name: "Restaurant 1", time: "3 mins", distance: "240 m" }
    ],
    schools: ["School 1 (0.5km)"],
    shopping: ["Mall 1 (0.4km)"],
    medical: ["Clinic 1 (0.3km)"],
    publicTransport: ["LRT Station (0.3km)"]
  }

  return (
    <WhatsNearby amenities={amenities} />
  )
}
\`\`\`

#### Features
- Category filter buttons
- Interactive place list
- Map view with markers
- Selected place details
- Map controls

---

### ContactAgent

Agent contact information and communication options.

#### Props
\`\`\`tsx
interface ContactAgentProps {
  agent: {
    name: string
    company: string
    phone: string
    email: string
  }
}
\`\`\`

#### Usage
\`\`\`tsx
import { ContactAgent } from "@/components/property-detail/contact-agent"

export default function PropertyDetail() {
  const agent = {
    name: "Sarah Lim",
    company: "PropQuest Realty",
    phone: "+60 12-345 6789",
    email: "sarah.lim@propquest.com"
  }

  return (
    <ContactAgent agent={agent} />
  )
}
\`\`\`

#### Features
- Agent avatar with initials
- Contact buttons (Call, Email, WhatsApp)
- Professional styling

---

### QuickStats

Property statistics in a grid format.

#### Props
\`\`\`tsx
interface QuickStatsProps {
  bedrooms: number
  bathrooms: number
  builtUpArea: string
  parking: number
}
\`\`\`

#### Usage
\`\`\`tsx
import { QuickStats } from "@/components/property-detail/quick-stats"

export default function PropertyDetail() {
  return (
    <QuickStats
      bedrooms={2}
      bathrooms={2}
      builtUpArea="850 sq ft"
      parking={1}
    />
  )
}
\`\`\`

#### Features
- 2x2 grid layout
- Large numbers with blue gradient
- Descriptive labels

---

### Facilities

Property facilities list with checkmark icons.

#### Props
\`\`\`tsx
interface FacilitiesProps {
  facilities: string[]
}
\`\`\`

#### Usage
\`\`\`tsx
import { Facilities } from "@/components/property-detail/facilities"

export default function PropertyDetail() {
  const facilities = [
    "24 hours security",
    "Swimming pool",
    "Gym",
    "Parking"
  ]

  return (
    <Facilities facilities={facilities} />
  )
}
\`\`\`

#### Features
- Vertical list layout
- Checkmark icons in blue circles
- Clean typography

---

### SimilarProperties

Related property suggestions.

#### Props
This component uses static data and doesn't accept props.

#### Usage
\`\`\`tsx
import { SimilarProperties } from "@/components/property-detail/similar-properties"

export default function PropertyDetail() {
  return (
    <SimilarProperties />
  )
}
\`\`\`

#### Features
- Property thumbnails
- Basic property info
- Hover effects
- Price display

---

## Best Practices

### Component Usage Guidelines

1. **Import Components Correctly**
   \`\`\`tsx
   // Correct
   import { TopBar } from "@/components/top-bar"
   
   // Avoid
   import TopBar from "@/components/top-bar"
   \`\`\`

2. **Handle State Properly**
   \`\`\`tsx
   // Good - lift state up when needed
   const [hoveredProperty, setHoveredProperty] = useState<number | null>(null)
   
   return (
     <PropertyCard
       isHovered={hoveredProperty === property.id}
       onMouseEnter={() => setHoveredProperty(property.id)}
       onMouseLeave={() => setHoveredProperty(null)}
     />
   )
   \`\`\`

3. **Use TypeScript Interfaces**
   \`\`\`tsx
   // Always define proper types
   interface Property {
     id: number
     name: string
     price: number
     // ... other properties
   }
   \`\`\`

4. **Handle Loading States**
   \`\`\`tsx
   // Consider loading states for data-dependent components
   if (loading) return <div>Loading...</div>
   if (error) return <div>Error: {error.message}</div>
   
   return <PropertyGrid properties={properties} />
   \`\`\`

### Performance Considerations

1. **Memoization**: Consider using `React.memo` for components that receive complex props
2. **Callback Optimization**: Use `useCallback` for event handlers passed to child components
3. **Image Optimization**: Use Next.js Image component for property images
4. **Lazy Loading**: Implement lazy loading for components not immediately visible

### Accessibility

1. **Semantic HTML**: All components use proper semantic elements
2. **ARIA Labels**: Interactive elements include appropriate ARIA attributes
3. **Keyboard Navigation**: Components support keyboard interaction
4. **Screen Readers**: Alt text and labels are provided for screen readers

### Styling

1. **Tailwind Classes**: All components use Tailwind CSS for consistent styling
2. **Responsive Design**: Components are mobile-first and responsive
3. **Color Scheme**: Blue gradient theme is consistently applied
4. **Spacing**: Consistent spacing using Tailwind's spacing scale
