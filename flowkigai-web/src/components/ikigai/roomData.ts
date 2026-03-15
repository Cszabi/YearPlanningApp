export interface RoomDefinition {
  type: number; // 1 = Love, 2 = GoodAt, 3 = WorldNeeds, 4 = PaidFor
  name: string;
  emoji: string;
  tagline: string;
  prompts: string[];
}

export const ROOMS: RoomDefinition[] = [
  {
    type: 1,
    name: "LOVE",
    emoji: "💛",
    tagline: "What makes you lose track of time?",
    prompts: [
      "Think of the last time you were completely absorbed in something. What were you doing?",
      "What would you do on a free Saturday with zero obligations and zero judgment?",
      "What topics do you find yourself reading about without anyone asking you to?",
      "When do you feel most like yourself?",
    ],
  },
  {
    type: 2,
    name: "GOOD AT",
    emoji: "💪",
    tagline: "What comes naturally to you that others find difficult?",
    prompts: [
      "What do friends, colleagues, or family ask you for help with most often?",
      "What skills have you built over years that you now take for granted?",
      "What feedback do you receive repeatedly — even if you brush it off?",
      "If you had to teach something to a room of strangers tomorrow, what would feel natural?",
    ],
  },
  {
    type: 3,
    name: "WORLD NEEDS",
    emoji: "🌍",
    tagline: "What problems do you feel pulled toward solving?",
    prompts: [
      "What injustice or inefficiency genuinely irritates you when you encounter it?",
      "Who do you feel most compelled to help — what kind of person, in what kind of situation?",
      "If you could change one thing about the world in your lifetime, what would it feel like to have changed it?",
      "What would you want people to say you contributed, at the end of your life?",
    ],
  },
  {
    type: 4,
    name: "PAID FOR",
    emoji: "💼",
    tagline: "What value do you create that the world will exchange something for?",
    prompts: [
      "What have people already paid you for, formally or informally?",
      "What value do you create in your work that feels underrecognised?",
      "If you had to generate income doing something close to your nature, what would the closest option be?",
      "What would you do for much less money than you currently earn — because it matters to you?",
    ],
  },
];

export const ROOM_TYPE_TO_INDEX: Record<string, number> = {
  Love: 0,
  GoodAt: 1,
  WorldNeeds: 2,
  PaidFor: 3,
};
