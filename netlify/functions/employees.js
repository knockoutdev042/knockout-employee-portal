/* ============================================================
   Netlify Function: /api/employees
   CRUD for data/employees.json, persisted as real git commits
   via the GitHub Contents API (no database needed).

   Required environment variables (set in Netlify site settings):
     GITHUB_TOKEN  - a GitHub PAT with 'repo' (contents: write) scope
   Optional (defaults shown):
     GITHUB_OWNER  - "knockoutdev042"
     GITHUB_REPO   - "knockout-employee-portal"
     GITHUB_BRANCH - "main"
   ============================================================ */

const GITHUB_API = 'https://api.github.com';
const OWNER = process.env.GITHUB_OWNER || 'knockoutdev042';
const REPO = process.env.GITHUB_REPO || 'knockout-employee-portal';
const BRANCH = process.env.GITHUB_BRANCH || 'main';
const FILE_PATH = 'data/employees.json';
const TOKEN = process.env.GITHUB_TOKEN;

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

function json(statusCode, body) {
  return {
    statusCode,
    headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
    body: JSON.stringify(body),
  };
}

function slugify(name) {
  return String(name)
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function initialsOf(name) {
  return String(name).trim().split(/\s+/).slice(0, 2).map(p => p[0].toUpperCase()).join('');
}

async function githubRequest(path, options = {}) {
  const res = await fetch(`${GITHUB_API}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      Accept: 'application/vnd.github+json',
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`GitHub API ${res.status}: ${text || res.statusText}`);
  }
  return res.json();
}

async function getEmployeesFile() {
  const data = await githubRequest(
    `/repos/${OWNER}/${REPO}/contents/${FILE_PATH}?ref=${BRANCH}`
  );
  const content = Buffer.from(data.content, 'base64').toString('utf-8');
  return { employees: JSON.parse(content), sha: data.sha };
}

async function putEmployeesFile(employees, sha, message) {
  const content = Buffer.from(JSON.stringify(employees, null, 2) + '\n', 'utf-8').toString(
    'base64'
  );
  return githubRequest(`/repos/${OWNER}/${REPO}/contents/${FILE_PATH}`, {
    method: 'PUT',
    body: JSON.stringify({ message, content, sha, branch: BRANCH }),
  });
}

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: CORS_HEADERS, body: '' };
  }

  if (!TOKEN) {
    return json(500, {
      error:
        'Server misconfigured: GITHUB_TOKEN is not set in Netlify environment variables.',
    });
  }

  const slugParam = event.queryStringParameters && event.queryStringParameters.slug;

  try {
    const { employees, sha } = await getEmployeesFile();

    switch (event.httpMethod) {
      case 'GET':
        return json(200, employees);

      case 'POST': {
        const body = JSON.parse(event.body || '{}');
        if (!body.name || !body.department) {
          return json(400, { error: 'name and department are required' });
        }
        const slug = slugify(body.slug || body.name);
        if (!slug) return json(400, { error: 'Could not derive a valid slug from name' });
        if (employees.some((e) => e.slug === slug)) {
          return json(409, { error: `An employee with slug "${slug}" already exists` });
        }
        const newEmployee = {
          name: body.name,
          role: body.role || '',
          department: body.department,
          shift: body.shift === 'Night' ? 'Night' : 'Day',
          slug,
          photo: body.photo || `images/team/${slug}.jpg`,
          initials: body.initials || initialsOf(body.name),
          email: body.email || '',
          phone: body.phone || '',
          location: body.location || '',
          joinDate: body.joinDate || '',
          bio: body.bio || '',
          reportsTo: body.reportsTo || '',
        };
        employees.push(newEmployee);
        await putEmployeesFile(employees, sha, `Add employee: ${newEmployee.name}`);
        return json(201, newEmployee);
      }

      case 'PUT': {
        if (!slugParam) return json(400, { error: 'slug query parameter is required' });
        const idx = employees.findIndex((e) => e.slug === slugParam);
        if (idx === -1) return json(404, { error: `Employee "${slugParam}" not found` });
        const body = JSON.parse(event.body || '{}');
        const updated = {
          ...employees[idx],
          ...body,
          slug: employees[idx].slug, // slug is immutable post-creation
        };
        employees[idx] = updated;
        await putEmployeesFile(employees, sha, `Update employee: ${updated.name}`);
        return json(200, updated);
      }

      case 'DELETE': {
        if (!slugParam) return json(400, { error: 'slug query parameter is required' });
        const idx = employees.findIndex((e) => e.slug === slugParam);
        if (idx === -1) return json(404, { error: `Employee "${slugParam}" not found` });
        const [removed] = employees.splice(idx, 1);
        await putEmployeesFile(employees, sha, `Remove employee: ${removed.name}`);
        return json(200, removed);
      }

      default:
        return json(405, { error: 'Method not allowed' });
    }
  } catch (err) {
    return json(500, { error: err.message });
  }
};
