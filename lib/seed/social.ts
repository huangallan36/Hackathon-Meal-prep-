/**
 * Seeded social graph: 8 fake users + the demo user, and ~30 posts built from the
 * cached recipe catalog (so post photos are real dish photos and "Cook this" works).
 * Everything is deterministic for a given `now`, so Most Popular stays stable.
 */
import { DEMO_USER } from "@/lib/config";
import { getCatalog } from "@/lib/recipes/catalog";
import type { SocialPost, SocialUser } from "@/lib/types";

export const SEED_USERS: SocialUser[] = [
  { handle: "maya.makes", name: "Maya Chen", avatar: "/avatars/maya.makes.svg", bio: "Dumpling enthusiast. I cook what my grandma cooked, just slightly worse.", location: "Vancouver, BC", followers: 1284, following: 312, streak: 12 },
  { handle: "dev.eats", name: "Dev Patel", avatar: "/avatars/dev.eats.svg", bio: "CS student surviving on one-pan dinners and optimism.", location: "Burnaby, BC", followers: 342, following: 198, streak: 4 },
  { handle: "sofia.sazon", name: "Sofía Ramírez", avatar: "/avatars/sofia.sazon.svg", bio: "Weeknight Mexican, weekend baking. Salsa is a food group.", location: "Surrey, BC", followers: 2210, following: 401, streak: 21 },
  { handle: "jordan.grills", name: "Jordan Okafor", avatar: "/avatars/jordan.grills.svg", bio: "If it can be grilled, I have grilled it. Yes, even lettuce.", location: "Richmond, BC", followers: 876, following: 150, streak: 7 },
  { handle: "priya.plates", name: "Priya Nair", avatar: "/avatars/priya.plates.svg", bio: "Plant-forward, spice-heavy, meal-prep obsessed.", location: "Coquitlam, BC", followers: 3105, following: 522, streak: 33 },
  { handle: "liam.loaf", name: "Liam O'Brien", avatar: "/avatars/liam.loaf.svg", bio: "Sourdough dad. Ask me about my starter (his name is Gary).", location: "New Westminster, BC", followers: 654, following: 233, streak: 9 },
  { handle: "hana.bento", name: "Hana Sato", avatar: "/avatars/hana.bento.svg", bio: "Tiny lunches, big flavour. Bento every weekday.", location: "Vancouver, BC", followers: 1890, following: 287, streak: 15 },
  { handle: "noah.kitchen", name: "Noah Martin", avatar: "/avatars/noah.kitchen.svg", bio: "Learning to cook one recipe at a time. Smoke alarm is my sous chef.", location: "North Vancouver, BC", followers: 211, following: 340, streak: 2 },
];

export const ME: SocialUser = {
  handle: DEMO_USER.handle,
  name: DEMO_USER.name,
  avatar: DEMO_USER.avatar,
  bio: DEMO_USER.bio,
  location: DEMO_USER.location,
  followers: 148,
  following: 96,
  streak: 5,
  isMe: true,
};

export function seedUsers(): SocialUser[] {
  return [ME, ...SEED_USERS];
}

const CAPTIONS = [
  "Weeknight win. Took 25 minutes and zero brain cells.",
  "Fridge clean-out dinner turned out way better than expected.",
  "Sous talked me through this one step by step, honestly a lifesaver.",
  "Made a double batch for lunches this week.",
  "Crispy bits are the best bits. Do not @ me.",
  "First time trying this and it's going straight into rotation.",
  "Comfort food after a long day of classes.",
  "My roommates demolished this in five minutes.",
  "Cooked with whatever was left before grocery day.",
  "Simple, cozy, no notes.",
  "This one is all about the sauce.",
  "Sunday reset meal prep.",
  "Rainy Vancouver evening called for exactly this.",
  "Swapped in what I had and it still slapped.",
  "Ten out of ten, would burn my tongue again.",
  "Plated it nicely for once. Felt fancy for a Tuesday.",
  "Leftovers tomorrow are going to be even better.",
  "Tried it with extra garlic. No regrets, only garlic.",
  "Finally nailed the timing on this one.",
  "Cooked this for my parents and they asked for the recipe!",
];

/** One extra, older post per cook in their own voice, so profiles feel lived-in */
const SIGNATURE: Record<string, string> = {
  "maya.makes": "Grandma would say it needs more ginger. Grandma is always right.",
  "dev.eats": "One pan, one fork, zero dishes left for my roommates to complain about.",
  "sofia.sazon": "Added a little chipotle because of course I did.",
  "jordan.grills": "Not grilled, I know. Branching out. Growth.",
  "priya.plates": "Meal prep Sunday: five lunches, zero sad desk salads.",
  "liam.loaf": "Gary (the starter) approves of this pairing.",
  "hana.bento": "Packed half of it into tomorrow's bento already.",
  "noah.kitchen": "No smoke alarm this time. Personal best.",
};

/** Deterministic upvote counts so the feed (and Most Popular) are stable across reloads */
const UPVOTES = [482, 37, 215, 96, 341, 18, 127, 264, 59, 403, 12, 188, 73, 299, 44, 156, 231, 88, 367, 25];
const SIGNATURE_UPVOTES = [142, 61, 318, 77, 405, 53, 196, 9];

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

export function seedPosts(now: number): SocialPost[] {
  const catalog = getCatalog();
  if (!catalog.length) return [];
  const authors = [...SEED_USERS.map((u) => u.handle)];
  const posts: SocialPost[] = [];
  for (let i = 0; i < 20; i++) {
    const recipe = catalog[(i * 7) % catalog.length];
    posts.push({
      id: `seed-post-${i}`,
      author: authors[i % authors.length],
      dishName: recipe.title,
      caption: CAPTIONS[(i * 7) % CAPTIONS.length],
      image: recipe.image,
      recipeId: recipe.id,
      upvotes: UPVOTES[i % UPVOTES.length],
      createdAt: now - (i * 3 + 1) * HOUR - (i % 4) * 17 * 60 * 1000,
    });
  }
  // A signature post per cook, 3-10 days old (fills out profile grids, sinks to the end of the feed)
  SEED_USERS.forEach((user, j) => {
    const recipe = catalog[(j * 5 + 3) % catalog.length];
    posts.push({
      id: `seed-sig-${j}`,
      author: user.handle,
      dishName: recipe.title,
      caption: SIGNATURE[user.handle] ?? CAPTIONS[j % CAPTIONS.length],
      image: recipe.image,
      recipeId: recipe.id,
      upvotes: SIGNATURE_UPVOTES[j % SIGNATURE_UPVOTES.length],
      createdAt: now - (3 + j) * DAY - (j % 3) * 5 * HOUR,
    });
  });
  // Two older posts from the demo user so their profile grid isn't empty
  for (let j = 0; j < 2; j++) {
    const recipe = catalog[(j * 3 + 1) % catalog.length];
    posts.push({
      id: `seed-me-${j}`,
      author: ME.handle,
      dishName: recipe.title,
      caption: j === 0 ? "Proud of this one. First time not burning the garlic." : "Lazy Sunday lunch.",
      image: recipe.image,
      recipeId: recipe.id,
      upvotes: j === 0 ? 64 : 21,
      createdAt: now - (2 + j * 3) * DAY,
    });
  }
  return posts;
}
