# Knockout Agency LLP — Team Portfolio Site

A fully static, zero-dependency team portfolio website generated from your employee Excel sheet.

---

## Folder Structure

```
knockout-agency-site/
├── index.html              ← Main page
├── netlify.toml            ← Netlify deploy config
├── README.md               ← This file
├── data/
│   └── employees.json      ← Employee data (auto-generated from Excel)
├── assets/
│   ├── css/styles.css      ← All styles (no framework)
│   └── js/app.js           ← All interactivity (vanilla JS)
└── images/
    └── team/               ← Drop employee photos here as <slug>.jpg
```

---

## Adding / Updating Employee Photos

Photos are matched by a **slugified version of the employee's name**:

| Employee Name          | Expected filename             |
|------------------------|-------------------------------|
| Mayuresh Sorap         | `mayuresh-sorap.jpg`          |
| Roshani Shinde         | `roshani-shinde.jpg`          |
| Aakash Pandit          | `aakash-pandit.jpg`           |
| Manish Mestry          | `manish-mestry.jpg`           |
| Mohammad Atique Khan   | `mohammad-atique-khan.jpg`    |
| Aman Patil             | `aman-patil.jpg`              |
| Tajinderpal Singh      | `tajinderpal-singh.jpg`       |
| Sarvesh Bhosale        | `sarvesh-bhosale.jpg`         |
| Nishant Bharmal        | `nishant-bharmal.jpg`         |
| Jyoti More             | `jyoti-more.jpg`              |
| Taufiquddin Shaikh     | `taufiquddin-shaikh.jpg`      |
| Saif Shaikh            | `saif-shaikh.jpg`             |
| Akshita Thappa         | `akshita-thappa.jpg`          |
| Namrata Pandurang      | `namrata-pandurang.jpg`       |
| Priyanka Kochrekar     | `priyanka-kochrekar.jpg`      |
| Deepa Yadav            | `deepa-yadav.jpg`             |
| Parmeshwar Sherve      | `parmeshwar-sherve.jpg`       |
| Shreyash Sanjay Patil  | `shreyash-sanjay-patil.jpg`   |
| Satyavijay Sapkal      | `satyavijay-sapkal.jpg`       |
| Shubham Vilas Girkar   | `shubham-vilas-girkar.jpg`    |
| Abdul Shaikh           | `abdul-shaikh.jpg`            |
| Moinul Khan            | `moinul-khan.jpg`             |
| Devendra Rajendra Patil| `devendra-rajendra-patil.jpg` |
| Suraj Kadam            | `suraj-kadam.jpg`             |
| Prashant Muni          | `prashant-muni.jpg`           |
| Royce D Souza          | `royce-d-souza.jpg`           |
| Shamam Rizvi           | `shamam-rizvi.jpg`            |
| Wilson Fernandes        | `wilson-fernandes.jpg`        |
| Shiv Pandey            | `shiv-pandey.jpg`             |
| Darshan Sawant         | `darshan-sawant.jpg`          |
| Karan Singh            | `karan-singh.jpg`             |
| Rina Nadar             | `rina-nadar.jpg`              |
| Nikita More            | `nikita-more.jpg`             |
| Sayed Junaid Ahmed     | `sayed-junaid-ahmed.jpg`      |
| Najeeb Mankar          | `najeeb-mankar.jpg`           |
| Omkar Kailash Garge    | `omkar-kailash-garge.jpg`     |
| Anup Santosh Kankale   | `anup-santosh-kankale.jpg`    |

> **Tip:** Any employee without a matching photo will automatically display a colourful initials-based avatar — no broken image icons.

---

## Refreshing Data from Excel

When your employee sheet changes, run the included Python script to regenerate `data/employees.json`:

### Requirements
```bash
pip install pandas openpyxl
```

### Script: `scripts/excel_to_json.py`
```python
"""
Usage:  python scripts/excel_to_json.py EmployeeSheet.xlsx
Output: data/employees.json
"""
import sys, json, re, unicodedata
import pandas as pd

DEPT_MAP = {
    'team lead': 'Digital Marketing',
    'marketing manager': 'Digital Marketing',
    'email marketing': 'Digital Marketing',
    'seo': 'Digital Marketing',
    'content writer': 'Digital Marketing',
    'web developer': 'Web Development',
    'full stack': 'Web Development',
    'ui/ux': 'Design',
    'graphic designer': 'Design',
    'customer service': 'Customer Service',
    'admin': 'Admin & Operations',
    'administrative': 'Admin & Operations',
    'office': 'Admin & Operations',
    'hr': 'HR',
    'human resource': 'HR',
    'salesforce': 'Salesforce',
}

def slugify(name):
    name = unicodedata.normalize('NFKD', name).encode('ascii', 'ignore').decode()
    name = re.sub(r'[^\w\s-]', '', name.lower())
    return re.sub(r'[\s_-]+', '-', name).strip('-')

def guess_dept(role):
    role_lower = role.lower()
    for keyword, dept in DEPT_MAP.items():
        if keyword in role_lower:
            return dept
    return 'General'

file = sys.argv[1] if len(sys.argv) > 1 else 'EmployeeSheet.xlsx'
df = pd.read_excel(file)
df.columns = [c.strip() for c in df.columns]

out = []
for _, row in df.iterrows():
    name = str(row.get('Employee name', '')).strip()
    role = str(row.get('Designation', '')).strip()
    shift_raw = str(row.get('SHIFT', 'DAY SHIFT')).upper()
    shift = 'Night' if 'NIGHT' in shift_raw else 'Day'
    if not name or name == 'nan': continue
    slug = slugify(name)
    out.append({
        'name': name,
        'role': role,
        'department': guess_dept(role),
        'shift': shift,
        'slug': slug,
        'photo': f'images/team/{slug}.jpg',
        'initials': ''.join(p[0].upper() for p in name.split()[:2]),
    })

with open('data/employees.json', 'w') as f:
    json.dump(out, f, indent=2)
print(f"✅ {len(out)} employees written to data/employees.json")
```

Run it:
```bash
python scripts/excel_to_json.py path/to/EmployeeSheet.xlsx
```

---

## Previewing Locally

Because the site fetches `data/employees.json` via `fetch()`, you need a local server (not just `file://`):

```bash
# Option A — Python (built-in)
cd knockout-agency-site
python3 -m http.server 3000
# Open http://localhost:3000

# Option B — Node (npx serve)
npx serve .
# Open the URL shown in terminal
```

---

## Deploy to Netlify

### Option 1 — Drag & Drop (fastest)

1. Go to [https://app.netlify.com](https://app.netlify.com) and sign in.
2. Click **"Add new site"** → **"Deploy manually"**.
3. Drag the entire `knockout-agency-site/` folder onto the upload area.
4. Netlify will publish your site in seconds and give you a live URL.

> To **update** the site: make your changes, then drag & drop the folder again on the same site's "Deploys" page.

### Option 2 — Git-Based (recommended for ongoing updates)

1. Push the `knockout-agency-site/` folder to a GitHub/GitLab/Bitbucket repository.
2. In Netlify, click **"Add new site"** → **"Import an existing project"**.
3. Connect your Git provider and select the repo.
4. Set:
   - **Branch to deploy:** `main` (or your default branch)
   - **Build command:** *(leave blank — this is a static site)*
   - **Publish directory:** `.` *(or the subfolder name if not at repo root)*
5. Click **"Deploy site"**.

Every time you push a commit, Netlify auto-deploys within ~30 seconds.

---

## 3-Step Netlify Deploy Checklist

- [ ] **1.** Add any employee photos to `/images/team/` using the filenames listed above.
- [ ] **2.** Verify `data/employees.json` is current (re-run the script if the Excel changed).
- [ ] **3.** Drag the `knockout-agency-site/` folder into Netlify → your site is live.

---

*Site built for Knockout Agency LLP · Vanilla HTML/CSS/JS · No frameworks · Fast first-paint*
