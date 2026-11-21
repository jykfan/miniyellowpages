# Mini Yellow Pages

A neighborhood directory and emergency-preparedness organizer. Collect your neighbors' contact info (with their consent), group them into small check-in **pods**, and print a booklet everyone can keep by the phone.

## What it does

- **Directory**: Each household has an address, a listing name, and a list of **people**, entered one at a time like passengers on a ticket booking. **Adults** have their own name, phone, email, occupation, emergency **skills** (nurse, electrician, ham radio, languages…) and special needs. **Children** have an optional first name, an optional age, and special needs or allergies. Shared **equipment** (generator, chainsaw, AED…), pets and other details belong to the household. Search and filter by skill ("who has a generator?").
- **Consent tracking**: One adult consents for the household, recording whether it agreed to be listed, when, by whom, and which details it's OK to print. A single **Children** permission (on by default) decides whether children appear in print. When it's on, children print as entered: a first name and age only if the family wrote them down, e.g. "Children: Sofia (6), Leo (9)" or "2 children (ages 6, 9)". Households without consent never appear in the booklet or pods. Organizer notes are never printed. Ages print as given, so the booklet's date shows when they were collected. Neighbors fill out a new form each year.
- **Pods**: Auto-assign consenting households into pods of up to 5 (configurable) by street and house number, so pod members are next-door neighbors. Each pod shows a headcount (people and children) so members know who to account for. You can rename pods, pick a captain, and move households by hand.
- **Prepare**: Guides for shutting off gas, water, and electricity; generators; earthquakes; wildfire evacuation; household plans; and the pod check-in protocol. Also interactive **go bag** (24 hours, for evacuating) and **stay kit** (3 days at home) checklists based on City of Berkeley guidance with Ready.gov additions, a Ready.gov guide to food when the power is out, and important phone numbers.
- **Print**: A print-ready booklet (letter size) you can configure. It has a cover with important numbers, a fill-in address-book page for each household's out-of-area contacts (name, phone, email, address), a directory grouped by street, a skills and resources index, pod check-off sheets, the guides, the go bag and stay kit checklists, OK/HELP window signs, and **blank sign-up and consent forms** to take door to door.
- **Import & export** (Directory tab or Settings):
  - **.json backup**: restores everything (households, pods, settings) and replaces the current data.
  - **.csv spreadsheet**: holds the same complete data as the backup. Households come first, one row each, including pod and pod captain. Below them are labeled `## Settings`, `## Important numbers` and `## Pods` sections. Importing adds households and updates any with the same name and address. Nothing is deleted. Settings, numbers and pods are restored when those sections are present. It accepts the app's own CSV export or your own spreadsheet. The first row must have column headings, including at least `names`/`name` or `address`. Common variations like "Street Address" and "Phone Number" are recognized, and tab-separated files work too.

## Privacy model

There's no server and no account. Everything is stored in the organizer's browser (`localStorage`) on one device. Nothing is uploaded. That keeps neighbors' personal information off the internet. The trade-off: **export a backup regularly**, and use the backup file to move the data to another computer or a co-organizer.

## Running it

It's a static site with no build step and no dependencies:

- Open `index.html` directly in a browser, or
- Serve the folder (`python3 -m http.server`) or host it free on GitHub Pages (Settings → Pages → deploy from branch).

## Suggested workflow

1. **Settings**: Enter your neighborhood name, organizer contact, meeting point, local utility numbers, and emergency radio stations.
2. **Directory → Print sign-up forms**: Set how many copies you need, print, and drop one at each door. Each form is a single page, laid out in the same order as the Add household screen. It has a "Who lives here" table with one row per person, and people write their initials next to each skill they have, with a consent section and an "Entered" checkbox to track data entry.
3. **Directory → + Add household**: Enter each form and tick the consent box.
4. **Pods → Auto-assign by address**: Then adjust and pick captains.
5. **Print**: Print the booklet (double-sided, "headers and footers" off) and hand it out.

## Customizing

Guide text, the go bag and stay kit lists, skill and equipment suggestions, and default phone numbers are in `content.js`. The guides are general guidance. Check them against your local utility and emergency-management agency.

## Files

- `index.html`: page shell
- `app.js`: app logic (directory, editor, pods, print booklet, import/export)
- `content.js`: editable content (guides, checklists, suggestions, sample data)
- `styles.css`: screen and print styles
