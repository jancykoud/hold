import type { ItemCategory } from '@hold/domain'
import { Accessibility, Armchair, Baby, Bike, Camera, Car, Caravan, Container, Drone, Dumbbell, Forklift, Gem, Guitar, Hammer, House, Laptop, Luggage, Motorbike, Package, PartyPopper, Sailboat, Scooter, Ship, Shirt, Snowflake, Speaker, Tent, Trees, Truck, Zap } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

// The sign beside a type's name: what kind of thing it is, at a glance. The kind is always also said in words.
export const CATEGORY_ICONS: Readonly<Record<ItemCategory, LucideIcon>> = {
  bike: Bike,
  e_bike: Zap,
  scooter: Scooter,
  water: Sailboat,
  snow: Snowflake,
  camera: Camera,
  camping: Tent,
  event: PartyPopper,
  tool: Hammer,
  car: Car,
  van: Truck,
  motorhome: Caravan,
  motorbike: Motorbike,
  trailer: Container,
  boat: Ship,
  machinery: Forklift,
  garden: Trees,
  mobility: Accessibility,
  baby: Baby,
  instrument: Guitar,
  clothing: Shirt,
  luxury: Gem,
  electronics: Laptop,
  drone: Drone,
  stage: Speaker,
  sport: Dumbbell,
  furniture: Armchair,
  travel: Luggage,
  space: House,
  other: Package,
}
