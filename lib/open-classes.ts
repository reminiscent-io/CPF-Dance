/**
 * Listing rules for the open classes on the dancer's Classes page: public
 * classes Courtney has put up for sign-up, as returned by
 * /api/dancer/public-classes. Safe on the client.
 */

export interface OpenClass {
  id: string
  title: string
  description: string | null
  location: string | null
  start_time: string
  end_time: string
  class_type: string
  series_id: string | null
  max_capacity: number | null
  pricing_model: string
  cost_per_person: number | null
  base_cost: number | null
  external_signup_url: string | null
  workshop_price: number | null
  workshop_signup_url: string | null
  workshop_full_only: boolean
  enrolled_count: number
  is_enrolled: boolean
  studio: {
    name: string
    city: string | null
    state: string | null
  } | null
  instructor: {
    full_name: string | null
  }
  // The promotional image or PDF the instructor attached to the class
  asset: {
    id: string
    title: string
    file_url: string
    file_type: string
  } | null
  // Set on the card for a multi-day workshop: every upcoming day, in order
  days?: WorkshopDay[]
}

export type WorkshopDay = Pick<OpenClass, 'id' | 'start_time' | 'end_time' | 'enrolled_count' | 'max_capacity' | 'is_enrolled'>

// One day of a workshop card, as a class of its own for a single-day drop-in
export const dayListing = (cls: OpenClass, day: WorkshopDay): OpenClass => ({ ...cls, ...day, days: undefined })

export const isMultiDay = (cls: OpenClass) => (cls.days?.length ?? 0) > 1

export const isClassFull = (cls: Pick<OpenClass, 'enrolled_count' | 'max_capacity'>) =>
  cls.max_capacity ? cls.enrolled_count >= cls.max_capacity : false

/**
 * One card per multi-day workshop. The full run enrolls in every day, so the
 * card carries the fullest day's count, and the dancer counts as enrolled
 * only once she holds every day.
 */
export function collapseWorkshops(classes: OpenClass[]): OpenClass[] {
  const listings: OpenClass[] = []
  const workshops = new Map<string, OpenClass>()
  for (const cls of classes) {
    if (cls.class_type !== 'workshop' || !cls.series_id) {
      listings.push(cls)
      continue
    }
    const day: WorkshopDay = {
      id: cls.id,
      start_time: cls.start_time,
      end_time: cls.end_time,
      enrolled_count: cls.enrolled_count,
      max_capacity: cls.max_capacity,
      is_enrolled: cls.is_enrolled
    }
    const existing = workshops.get(cls.series_id)
    if (existing) {
      existing.days!.push(day)
      existing.enrolled_count = Math.max(existing.enrolled_count, cls.enrolled_count)
      existing.is_enrolled = existing.is_enrolled && cls.is_enrolled
      if (cls.max_capacity !== null) {
        existing.max_capacity = existing.max_capacity === null
          ? cls.max_capacity
          : Math.min(existing.max_capacity, cls.max_capacity)
      }
    } else {
      const listing = { ...cls, days: [day] }
      workshops.set(cls.series_id, listing)
      listings.push(listing)
    }
  }
  return listings
}

/**
 * Every listing still ahead of `now`, enrolled or not. A class the dancer
 * has fully signed up for leaves the open list and shows with her own
 * classes instead; the deep-link handler still needs it to say so.
 */
export function upcomingListings(classes: OpenClass[], now: Date): OpenClass[] {
  return collapseWorkshops(classes.filter(cls => new Date(cls.start_time) > now))
}
