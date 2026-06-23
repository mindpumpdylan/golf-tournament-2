export type Profile = {
  id: string
  email: string
  full_name: string
  nickname: string | null
  avatar_url: string | null
  handicap: number | null
  ghin_number: string | null
  phone_number: string | null
  sms_consent: boolean
  is_admin: boolean
  created_at: string
  bio: string | null
  home_course: string | null
  years_playing: number | null
  shirt_size: string | null
  invited_by: string | null
}

export type AvailabilityDate = {
  id: string
  user_id: string
  date: string
  created_at: string
}

export type Reservation = {
  id: string
  reserver_id: string
  player_id: string | null
  guest_name: string
  guest_email: string
  guest_phone: string | null
  status: 'pending' | 'confirmed' | 'expired'
  invite_token: string | null
  invite_expires_at: string | null
  pairing_preference: string | null
  created_at: string
}

export type Team = {
  id: string
  tournament_year: number
  name: string
  created_at: string
}

export type TeamMember = {
  id: string
  team_id: string
  player_id: string
  created_at: string
}

export type Score = {
  id: string
  team_id: string
  hole_number: number
  strokes: number
  entered_by: string
  created_at: string
}

export type ClosestToPin = {
  id: string
  tournament_year: number
  hole_number: number
  player_id: string
  distance_feet: number
  distance_inches: number
  created_at: string
}

export type TournamentRegistration = {
  id: string
  player_id: string
  tournament_year: number
  created_at: string
}

export type MediaPost = {
  id: string
  user_id: string
  cloudinary_url: string
  cloudinary_public_id: string
  media_type: 'photo' | 'video'
  hole_number: number | null
  caption: string | null
  tournament_year: number
  created_at: string
}
