/**
 * Firebase Cloud Function — Weekly Challenge Generator
 *
 * Runs every Monday at midnight UTC. For each child in Firestore, calls
 * the FastAPI backend to generate that week's challenge.
 *
 * Setup:
 *   1. cd functions && npm init -y && npm install firebase-functions firebase-admin axios
 *   2. firebase deploy --only functions
 *
 * The mobile app also auto-generates challenges as a client-side fallback,
 * so this function is an enhancement, not a hard dependency.
 */
const functions = require("firebase-functions");
const admin = require("firebase-admin");
const axios = require("axios");

admin.initializeApp();

const API_BASE_URL =
  functions.config().api?.base_url || "http://localhost:8000";

/**
 * Derive grade level from age (mirrors mobile/src/services/api/lesson.ts).
 */
function gradeLevel(age) {
  if (age <= 4) return "Pre-K";
  if (age === 5) return "Kindergarten";
  if (age === 6) return "1st grade";
  if (age === 7) return "2nd grade";
  if (age === 8) return "3rd grade";
  return "3rd-4th grade";
}

/**
 * Scheduled function: runs every Monday at 00:00 UTC.
 *
 * For each child document in Firestore, POST to /api/v1/challenges/generate
 * to create this week's challenge. The endpoint is idempotent — if a
 * challenge already exists for the week, it returns the existing one.
 */
exports.generateWeeklyChallenges = functions.pubsub
  .schedule("every monday 00:00")
  .timeZone("UTC")
  .onRun(async (_context) => {
    const db = admin.firestore();
    const childrenSnapshot = await db.collection("children").get();

    const results = { success: 0, failed: 0, skipped: 0 };

    for (const doc of childrenSnapshot.docs) {
      const child = doc.data();

      if (!child.name || !child.age) {
        results.skipped++;
        continue;
      }

      try {
        // Fetch weak skills from progress subcollection
        const progressDocs = await db
          .collection("children")
          .doc(doc.id)
          .collection("progress")
          .get();

        const weakSkills = [];
        progressDocs.forEach((pDoc) => {
          const p = pDoc.data();
          if (p.accuracy_rate < 0.6 && p.questions_answered > 3) {
            weakSkills.push(`${pDoc.id}.level_${p.level || 1}`);
          }
        });

        await axios.post(`${API_BASE_URL}/api/v1/challenges/generate`, {
          child_id: doc.id,
          child_name: child.name,
          grade_level: gradeLevel(child.age),
          top_weak_skills: weakSkills.slice(0, 5),
          interests: child.interests || [],
        });

        results.success++;
      } catch (err) {
        console.error(
          `Failed to generate challenge for child ${doc.id}:`,
          err.message,
        );
        results.failed++;
      }
    }

    console.log("Weekly challenge generation complete:", results);
    return null;
  });
