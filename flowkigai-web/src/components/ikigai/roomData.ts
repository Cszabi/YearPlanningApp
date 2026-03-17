const U = (id: string) =>
  `https://images.unsplash.com/${id}?w=800&h=360&q=80&auto=format&fit=crop`;

export interface RoomDefinition {
  type: number; // 1 = Love, 2 = GoodAt, 3 = WorldNeeds, 4 = PaidFor
  name: string;
  emoji: string;
  tagline: string;
  promptImages: string[]; // one image per prompt
  prompts: string[];
}

export const ROOMS: RoomDefinition[] = [
  {
    type: 1,
    name: "LOVE",
    emoji: "💛",
    tagline: "What makes you lose track of time?",
    promptImages: [
      U("photo-1493225457124-a3eb161ffa5f"), // musician — absorbed in something
      U("photo-1506905925346-21bda4d32df4"), // mountain lake — free, no obligations
      U("photo-1481627834876-b7833e8f5570"), // bookshelf — topics you seek out
      U("photo-1532274402911-5a369e4c4bb5"), // mountains at sunset — feeling yourself
    ],
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
    promptImages: [
      U("photo-1519389950473-47ba0277781c"), // team — people ask for help
      U("photo-1544928147-79a2dbc1f389"), // hands on craft — skills built over years
      U("photo-1471560090527-d1af5e4e6eb6"), // reflection — feedback you receive
      U("photo-1553877522-43269d4ea984"), // design work — what you'd teach
    ],
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
    promptImages: [
      U("photo-1455390582262-044cdead277a"), // strong emotion — what irritates you
      U("photo-1488521787991-ed7bbaae773c"), // helping hands — who you help
      U("photo-1466611653911-95081537e5b7"), // sunrise — changing the world
      U("photo-1511632765486-a01980e01a18"), // night sky — what you'd be remembered for
    ],
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
    promptImages: [
      U("photo-1454165804606-c3d57bc86b40"), // desk work — paid for what
      U("photo-1499750310107-5fef28a66643"), // focused work — underrecognised value
      U("photo-1416339684178-3a239570f315"), // creative studio — income from your nature
      U("photo-1508739773434-c26b3d09e071"), // sunset — what you'd do for less
    ],
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
