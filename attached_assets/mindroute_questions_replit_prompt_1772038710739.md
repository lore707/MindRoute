# REPLIT INSTRUCTIONS — Questions Page Integration

Replace the current profiling/questions flow with the new design. Here's what the new page includes and how it should work:

## WHAT'S NEW

The questions page has been completely rebuilt with a 3-column layout:

1. **LEFT COLUMN**: Vertical progress indicator with numbered dots (1-7). Active question is highlighted in accent color. Completed questions are dimmed. Users can click on completed/current dots to navigate between questions.

2. **CENTER COLUMN**: The main question area with:
   - Question label ("QUESTION 01")
   - Question text in large serif font with italic emphasis on key phrases
   - A hint in gray italic below each question to encourage deeper answers
   - A textarea for open-ended answers (NOT multiple choice)
   - Back and Continue buttons
   - Floating identity words in the background (very faint, decorative)
   - Small decorative dots

3. **RIGHT COLUMN**: Sidebar with:
   - "Why this question?" card explaining what the question reveals
   - "What we're mapping" card with tag pills showing the psychological dimensions
   - Privacy notice ("Your answers are only used to find your destinations")

## FLOW

1. User sees Question 1 → types answer → clicks Continue (or presses Enter)
2. A micro-reaction appears briefly center-screen ("Got it.", "Interesting.", etc.) then fades
3. Next question slides in with animation
4. After Question 7, the practical details form appears (days, when, budget, departure city)
5. User fills form and clicks "Find me a place" → navigates to destinations page

## IMPORTANT DETAILS

- All 7 questions are OPEN-ENDED text areas, never multiple choice
- The Continue button should be disabled when textarea is empty (actually, allow empty answers but style differently)
- The navbar shows a segmented progress bar with "1 / 7" count
- "Save & exit" button in navbar top-right
- Keyboard shortcuts: Enter to continue, Shift+Enter for new line
- The page must preserve answers when navigating back to previous questions
- On mobile (<1024px): hide the left vertical progress and right sidebar, show only center content

## THE 7 QUESTIONS (exact text)

Q1: "Your last trip — did it disappoint or *surprise* you? What didn't you expect?"
Hint: "Even small moments count — a smell, a conversation, a wrong turn."

Q2: "If you could disappear for a week without telling anyone — and *without being able to post anything* — where would you go?"  
Hint: "No judgment. No budget. No logistics. Just you."

Q3: "What made you feel *most alive* in the last year — even if it has nothing to do with travel?"
Hint: "It doesn't have to be dramatic. Sometimes it's the quietest moments."

Q4: "When you travel, what puts you more at ease: *knowing everything in advance* or discovering as you go?"
Hint: "There's no right answer. Some people need a map, others need to get lost."

Q5: "Is there a place everyone loves that just *doesn't speak to you* — not because it's bad, it's just not yours?"
Hint: "This tells us as much as what you love."

Q6: "If this trip were meant to do something for you — *without knowing what in advance* — what do you hope will be different when you come back?"
Hint: "You don't need to know exactly. A feeling is enough."

Q7: "Right now, do you feel more *energized* or more *tired?*"
Hint: "Be honest. This changes everything about what we suggest."

## PRACTICAL FORM (after Q7)

Title: "Almost there."
Subtitle: "Just a few practical details to find your perfect match."

Fields:
- How many days do you have? (number)
- When would you leave? (text, placeholder: "e.g. Mid-March, Next summer...")
- How much do you want to spend, roughly? (text, placeholder: "e.g. €1500, budget-friendly, no limits...")  
- Where are you departing from? (text, placeholder: "e.g. Milan, London, Tokyo")
- Button: "Find me a place →"

## DESIGN SPECS

- Background: #FDFAF7
- Text: #1A1A2E
- Accent: #E94560
- Textarea border: #E8E3DD default, #E94560 on focus
- Continue button: #E94560 background, white text, rounded full
- Font headings: DM Serif Display
- Font body: Plus Jakarta Sans
- Card backgrounds: white with subtle border #E8E3DD

I have provided the complete HTML file with all the code. Replace the current questions page with this new implementation.
