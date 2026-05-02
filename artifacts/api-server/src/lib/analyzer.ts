interface Fix {
  title: string;
  description: string;
  codeSnippet?: string;
  language?: string;
}

interface StackOverflowLink {
  title: string;
  url: string;
}

interface AnalysisOutput {
  errorType: string;
  language: string;
  rootCause: string;
  confidenceScore: number;
  priority: "Critical" | "High" | "Medium" | "Low";
  explanation: string[];
  fixes: Fix[];
  stackOverflowLinks: StackOverflowLink[];
}

interface ErrorPattern {
  id: string;
  errorType: string;
  language: string;
  patterns: RegExp[];
  rootCause: string;
  confidenceBonus: number;
  priority: "Critical" | "High" | "Medium" | "Low";
  explanation: string[];
  fixes: Fix[];
  stackOverflowLinks: StackOverflowLink[];
}

const ERROR_PATTERNS: ErrorPattern[] = [
  // ─── NullPointerException (Java) ───────────────────────────────────────
  {
    id: "java-npe",
    errorType: "NullPointerException",
    language: "Java",
    patterns: [/NullPointerException/i, /java\.lang\.NullPointerException/i],
    rootCause:
      "An object reference is null when the code tries to access one of its methods or fields.",
    confidenceBonus: 30,
    priority: "High",
    explanation: [
      "The JVM encountered a null reference where a valid object was expected.",
      "Common causes: uninitialized variable, method returning null, missing null-check after optional lookup.",
      "Check the stack trace line number — that is where the null dereference occurred.",
      "Inspect every object in that call chain for potential null values.",
    ],
    fixes: [
      {
        title: "Add null check before use",
        description: "Guard object access with an explicit null check.",
        codeSnippet: `// Before\nString name = user.getName().toUpperCase();\n\n// After\nif (user != null && user.getName() != null) {\n    String name = user.getName().toUpperCase();\n}`,
        language: "java",
      },
      {
        title: "Use Optional<T>",
        description: "Wrap the nullable value with Optional to force explicit handling.",
        codeSnippet: `Optional<String> name = Optional.ofNullable(user)\n    .map(User::getName);\nname.ifPresent(n -> System.out.println(n.toUpperCase()));`,
        language: "java",
      },
      {
        title: "Use Objects.requireNonNull",
        description: "Fail fast at entry points with a descriptive message.",
        codeSnippet: `import java.util.Objects;\nString name = Objects.requireNonNull(user, "user must not be null").getName();`,
        language: "java",
      },
    ],
    stackOverflowLinks: [
      { title: "NullPointerException — what it means and how to fix it", url: "https://stackoverflow.com/questions/218384/what-is-a-nullpointerexception-and-how-do-i-fix-it" },
      { title: "Java Optional to avoid NullPointerException", url: "https://stackoverflow.com/questions/26327957/should-java-8-getters-return-optional-type" },
    ],
  },

  // ─── TypeError: Cannot read properties (JavaScript) ──────────────────
  {
    id: "js-typeerror-null",
    errorType: "TypeError",
    language: "JavaScript",
    patterns: [
      /TypeError: Cannot read propert/i,
      /TypeError: Cannot read properties of (null|undefined)/i,
      /TypeError: (null|undefined) is not an object/i,
    ],
    rootCause:
      "Attempting to access a property or method on a null or undefined value in JavaScript.",
    confidenceBonus: 28,
    priority: "High",
    explanation: [
      "JavaScript accessed a property on a value that is null or undefined.",
      "This often happens when an API call hasn't resolved yet, or a DOM element wasn't found.",
      "Check whether the variable was properly initialized before access.",
      "Use optional chaining (?.) to safely traverse object paths.",
    ],
    fixes: [
      {
        title: "Use optional chaining (?.)",
        description: "Safely access nested properties without throwing.",
        codeSnippet: `// Before\nconst city = user.address.city;\n\n// After\nconst city = user?.address?.city ?? 'Unknown';`,
        language: "javascript",
      },
      {
        title: "Guard with conditional check",
        description: "Check the value exists before accessing it.",
        codeSnippet: `if (user && user.address) {\n    console.log(user.address.city);\n}`,
        language: "javascript",
      },
      {
        title: "Provide default value with nullish coalescing",
        description: "Fall back gracefully when the value is null/undefined.",
        codeSnippet: `const name = (response?.data?.user ?? {}).name ?? 'Guest';`,
        language: "javascript",
      },
    ],
    stackOverflowLinks: [
      { title: "TypeError: Cannot read property of undefined", url: "https://stackoverflow.com/questions/14782232/how-to-avoid-cannot-read-property-of-undefined-errors" },
      { title: "Optional chaining in JavaScript", url: "https://stackoverflow.com/questions/62613378/optional-chaining-operator-and-optional-bracket-notation" },
    ],
  },

  // ─── Uncaught ReferenceError (JavaScript) ────────────────────────────
  {
    id: "js-referenceerror",
    errorType: "ReferenceError",
    language: "JavaScript",
    patterns: [/ReferenceError: (\w+) is not defined/i, /Uncaught ReferenceError/i],
    rootCause:
      "A variable or function is referenced before it is declared or is out of scope.",
    confidenceBonus: 25,
    priority: "Medium",
    explanation: [
      "JavaScript couldn't find the variable in the current or any parent scope.",
      "Common causes: typo in variable name, variable declared inside a block and used outside, or missing import.",
      "Check spelling of the variable name and ensure it is in scope where it is used.",
    ],
    fixes: [
      {
        title: "Declare the variable before use",
        description: "Ensure the variable is declared with let, const, or var.",
        codeSnippet: `// Before\nconsole.log(myVar); // ReferenceError\n\n// After\nconst myVar = 'hello';\nconsole.log(myVar);`,
        language: "javascript",
      },
      {
        title: "Check for missing imports",
        description: "Make sure the module is imported at the top of the file.",
        codeSnippet: `import { myFunction } from './utils';\nmyFunction();`,
        language: "javascript",
      },
    ],
    stackOverflowLinks: [
      { title: "ReferenceError: variable is not defined", url: "https://stackoverflow.com/questions/7252483/referenceerror-variable-is-not-defined" },
    ],
  },

  // ─── Python AttributeError ───────────────────────────────────────────
  {
    id: "py-attributeerror",
    errorType: "AttributeError",
    language: "Python",
    patterns: [/AttributeError: '(\w+)' object has no attribute/i, /AttributeError:/i],
    rootCause:
      "Accessing an attribute or method that doesn't exist on the given Python object.",
    confidenceBonus: 27,
    priority: "Medium",
    explanation: [
      "The object doesn't have the attribute you're trying to access.",
      "This can happen if the object is None, the wrong type, or the attribute name has a typo.",
      "Check the object type with type() and verify the attribute exists with dir().",
    ],
    fixes: [
      {
        title: "Check attribute existence with hasattr",
        description: "Verify the attribute exists before accessing it.",
        codeSnippet: `if hasattr(obj, 'my_attr'):\n    value = obj.my_attr\nelse:\n    value = default_value`,
        language: "python",
      },
      {
        title: "Use getattr with a default",
        description: "Safely access attribute with a fallback.",
        codeSnippet: `value = getattr(obj, 'my_attr', None)`,
        language: "python",
      },
    ],
    stackOverflowLinks: [
      { title: "Python AttributeError: object has no attribute", url: "https://stackoverflow.com/questions/610883/how-to-know-if-an-object-has-an-attribute-in-python" },
    ],
  },

  // ─── Python ImportError ──────────────────────────────────────────────
  {
    id: "py-importerror",
    errorType: "ImportError",
    language: "Python",
    patterns: [/ModuleNotFoundError: No module named/i, /ImportError:/i],
    rootCause: "Python cannot locate the specified module. It is not installed or not on sys.path.",
    confidenceBonus: 28,
    priority: "High",
    explanation: [
      "The module is either not installed in the current Python environment or the import path is wrong.",
      "Check if the package is in requirements.txt / pyproject.toml and installed.",
      "Verify you're running the script in the correct virtual environment.",
    ],
    fixes: [
      {
        title: "Install the missing package",
        description: "Use pip to install the missing module.",
        codeSnippet: `pip install <module_name>\n# or\npip install -r requirements.txt`,
        language: "bash",
      },
      {
        title: "Check virtual environment activation",
        description: "Make sure your venv is active.",
        codeSnippet: `# Activate venv\nsource venv/bin/activate  # Linux/macOS\nvenv\\Scripts\\activate     # Windows`,
        language: "bash",
      },
    ],
    stackOverflowLinks: [
      { title: "ModuleNotFoundError: No module named", url: "https://stackoverflow.com/questions/1300962/python-no-module-named-xyz" },
    ],
  },

  // ─── Python KeyError ─────────────────────────────────────────────────
  {
    id: "py-keyerror",
    errorType: "KeyError",
    language: "Python",
    patterns: [/KeyError: '?(\w+)'?/i],
    rootCause: "Accessing a dictionary key that does not exist.",
    confidenceBonus: 25,
    priority: "Medium",
    explanation: [
      "The dictionary does not contain the key you are trying to access.",
      "Use dict.get() to safely retrieve values or check key existence with 'in'.",
    ],
    fixes: [
      {
        title: "Use dict.get() with default",
        description: "Safely access dictionary values without raising KeyError.",
        codeSnippet: `value = my_dict.get('key', 'default_value')`,
        language: "python",
      },
      {
        title: "Check key existence first",
        description: "Use 'in' to check before accessing.",
        codeSnippet: `if 'key' in my_dict:\n    value = my_dict['key']`,
        language: "python",
      },
    ],
    stackOverflowLinks: [
      { title: "How to handle KeyError in Python", url: "https://stackoverflow.com/questions/11041405/why-dict-getkey-instead-of-dictkey" },
    ],
  },

  // ─── OutOfMemoryError (Java / Node.js) ───────────────────────────────
  {
    id: "oom",
    errorType: "MemoryError",
    language: "Java",
    patterns: [
      /OutOfMemoryError/i,
      /java\.lang\.OutOfMemoryError/i,
      /heap space/i,
      /GC overhead limit exceeded/i,
    ],
    rootCause:
      "The JVM ran out of heap memory. Possible causes: memory leak, insufficient heap size, or processing extremely large data sets.",
    confidenceBonus: 30,
    priority: "Critical",
    explanation: [
      "The JVM exhausted its available heap memory.",
      "Investigate for memory leaks using a profiler (VisualVM, Eclipse MAT).",
      "Check for unclosed resources, large collection accumulations, or static caches that grow unbounded.",
      "Consider increasing JVM heap size with -Xmx flag as a temporary workaround.",
    ],
    fixes: [
      {
        title: "Increase JVM heap size",
        description: "Temporarily increase heap to confirm OOM is the cause.",
        codeSnippet: `java -Xms512m -Xmx2g -jar your-app.jar`,
        language: "bash",
      },
      {
        title: "Profile memory usage",
        description: "Use VisualVM or jmap to dump heap and find leaks.",
        codeSnippet: `jmap -heap <pid>\njmap -dump:format=b,file=heap.hprof <pid>`,
        language: "bash",
      },
      {
        title: "Close resources properly",
        description: "Use try-with-resources to ensure connections/streams are closed.",
        codeSnippet: `try (Connection conn = dataSource.getConnection();\n     PreparedStatement ps = conn.prepareStatement(sql)) {\n    // use ps\n}`,
        language: "java",
      },
    ],
    stackOverflowLinks: [
      { title: "Java heap space OutOfMemoryError", url: "https://stackoverflow.com/questions/37335/how-to-deal-with-java-lang-outofmemoryerror-java-heap-space-error" },
    ],
  },

  // ─── Node.js heap out of memory ──────────────────────────────────────
  {
    id: "node-oom",
    errorType: "MemoryError",
    language: "Node.js",
    patterns: [/FATAL ERROR: CALL_AND_RETRY_LAST Allocation failed/i, /JavaScript heap out of memory/i],
    rootCause: "Node.js ran out of V8 heap memory. This is often caused by large data processing, memory leaks, or insufficient heap allocation.",
    confidenceBonus: 30,
    priority: "Critical",
    explanation: [
      "The V8 engine exhausted its heap memory allocation.",
      "Inspect for memory leaks using node --inspect and Chrome DevTools heap snapshots.",
      "Look for unbounded arrays, event listener accumulation, or large buffer operations.",
    ],
    fixes: [
      {
        title: "Increase Node.js heap size",
        description: "Set the max old space size before running your app.",
        codeSnippet: `node --max-old-space-size=4096 app.js\n# or in package.json:\n"start": "node --max-old-space-size=4096 app.js"`,
        language: "bash",
      },
      {
        title: "Use streaming for large data",
        description: "Process files and responses in streams rather than loading all into memory.",
        codeSnippet: `const fs = require('fs');\nconst readStream = fs.createReadStream('large-file.csv');\nreadStream.pipe(processStream).pipe(outputStream);`,
        language: "javascript",
      },
      {
        title: "Profile with --inspect flag",
        description: "Connect Chrome DevTools to profile memory usage.",
        codeSnippet: `node --inspect app.js\n# Open chrome://inspect in Chrome`,
        language: "bash",
      },
    ],
    stackOverflowLinks: [
      { title: "Node.js — JavaScript heap out of memory", url: "https://stackoverflow.com/questions/38558989/node-js-heap-out-of-memory" },
    ],
  },

  // ─── Connection Timeout ───────────────────────────────────────────────
  {
    id: "timeout",
    errorType: "TimeoutError",
    language: "System",
    patterns: [
      /connection timed? ?out/i,
      /ETIMEDOUT/i,
      /ESOCKETTIMEDOUT/i,
      /Read timed? ?out/i,
      /SocketTimeoutException/i,
      /TimeoutError/i,
      /gateway timeout/i,
      /504 gateway/i,
    ],
    rootCause:
      "A network connection or operation did not complete within the allowed time window.",
    confidenceBonus: 25,
    priority: "High",
    explanation: [
      "The system waited too long for a response from an external service or database.",
      "Possible causes: slow network, overloaded server, long-running query, or firewall blocking connections.",
      "Check network latency to the target service and inspect server load metrics.",
      "Review your timeout settings and consider adding retry logic with exponential backoff.",
    ],
    fixes: [
      {
        title: "Increase timeout threshold",
        description: "Set an appropriate timeout value for the operation.",
        codeSnippet: `// Node.js with axios\nconst response = await axios.get(url, { timeout: 10000 }); // 10 seconds\n\n// fetch API\nconst controller = new AbortController();\nconst id = setTimeout(() => controller.abort(), 10000);\nconst res = await fetch(url, { signal: controller.signal });`,
        language: "javascript",
      },
      {
        title: "Add retry with exponential backoff",
        description: "Retry failed requests with increasing delay.",
        codeSnippet: `async function fetchWithRetry(url, retries = 3) {\n  for (let i = 0; i < retries; i++) {\n    try {\n      return await fetch(url);\n    } catch (err) {\n      if (i === retries - 1) throw err;\n      await new Promise(r => setTimeout(r, Math.pow(2, i) * 1000));\n    }\n  }\n}`,
        language: "javascript",
      },
      {
        title: "Check service health",
        description: "Verify the target service is reachable.",
        codeSnippet: `# Test connectivity\ncurl -v --max-time 5 http://your-service/health\n\n# Check open ports\nnc -zv hostname port`,
        language: "bash",
      },
    ],
    stackOverflowLinks: [
      { title: "How to handle ETIMEDOUT in Node.js", url: "https://stackoverflow.com/questions/17245881/node-js-econnrefused" },
      { title: "Retry logic with exponential backoff", url: "https://stackoverflow.com/questions/51248618/implement-retry-logic-in-node-js-fetch" },
    ],
  },

  // ─── Database connection error (MySQL/PostgreSQL/MongoDB) ────────────
  {
    id: "db-connection",
    errorType: "DatabaseConnectionError",
    language: "Database",
    patterns: [
      /ECONNREFUSED.*5432/i,
      /ECONNREFUSED.*3306/i,
      /ECONNREFUSED.*27017/i,
      /Connection refused.*postgres/i,
      /Access denied for user.*mysql/i,
      /authentication failed.*postgres/i,
      /MongoNetworkError/i,
      /MongoServerError/i,
      /SequelizeConnectionError/i,
      /could not connect to server/i,
      /pg.*connection/i,
    ],
    rootCause:
      "The application cannot establish a connection to the database server.",
    confidenceBonus: 28,
    priority: "Critical",
    explanation: [
      "The database connection was refused or authentication failed.",
      "Common causes: wrong host/port/credentials, database server not running, or firewall rules blocking the port.",
      "Verify DATABASE_URL or individual connection parameters (host, port, user, password, dbname).",
      "Check if the database process is running on the target host.",
    ],
    fixes: [
      {
        title: "Verify database server is running",
        description: "Check the DB process and port availability.",
        codeSnippet: `# PostgreSQL\npg_isready -h localhost -p 5432\npsql -U postgres -h localhost\n\n# MySQL\nmysql -u root -p -h 127.0.0.1\n\n# MongoDB\nmongosh --host localhost --port 27017`,
        language: "bash",
      },
      {
        title: "Check connection string",
        description: "Make sure all credentials and host information are correct.",
        codeSnippet: `# .env file example\nDATABASE_URL=postgresql://user:password@localhost:5432/dbname\n\n# Test connection\npsql $DATABASE_URL`,
        language: "bash",
      },
      {
        title: "Add connection pool with retry",
        description: "Use a connection pool with retry on initial connect.",
        codeSnippet: `const { Pool } = require('pg');\nconst pool = new Pool({\n  connectionString: process.env.DATABASE_URL,\n  connectionTimeoutMillis: 5000,\n  idleTimeoutMillis: 30000,\n  max: 20,\n});`,
        language: "javascript",
      },
    ],
    stackOverflowLinks: [
      { title: "ECONNREFUSED connecting to PostgreSQL", url: "https://stackoverflow.com/questions/15306770/pg-connect-econnrefused-connect-econnrefused" },
      { title: "MongoDB connection refused", url: "https://stackoverflow.com/questions/35779949/mongonetworkerror-failed-to-connect-to-server" },
    ],
  },

  // ─── MySQL errors ─────────────────────────────────────────────────────
  {
    id: "mysql-error",
    errorType: "MySQLError",
    language: "Database",
    patterns: [/ER_ACCESS_DENIED_ERROR/i, /ER_NO_SUCH_TABLE/i, /ER_DUP_ENTRY/i, /MySQL.*error/i],
    rootCause: "A MySQL-specific error occurred — access denied, table not found, or duplicate entry.",
    confidenceBonus: 25,
    priority: "High",
    explanation: [
      "MySQL returned an error code indicating a query or connection issue.",
      "ER_ACCESS_DENIED: wrong credentials. ER_NO_SUCH_TABLE: migration not run. ER_DUP_ENTRY: unique constraint violation.",
      "Check the MySQL error code prefix for the specific issue.",
    ],
    fixes: [
      {
        title: "Fix access denied error",
        description: "Grant proper privileges to the database user.",
        codeSnippet: `GRANT ALL PRIVILEGES ON mydb.* TO 'myuser'@'%' IDENTIFIED BY 'password';\nFLUSH PRIVILEGES;`,
        language: "sql",
      },
      {
        title: "Handle duplicate entry gracefully",
        description: "Use INSERT IGNORE or ON DUPLICATE KEY UPDATE.",
        codeSnippet: `INSERT INTO users (email, name)\nVALUES ('a@b.com', 'Alice')\nON DUPLICATE KEY UPDATE name = VALUES(name);`,
        language: "sql",
      },
    ],
    stackOverflowLinks: [
      { title: "MySQL ER_ACCESS_DENIED_ERROR", url: "https://stackoverflow.com/questions/1559955/host-xxx-is-not-allowed-to-connect-to-this-mysql-server" },
    ],
  },

  // ─── HTTP 404 ─────────────────────────────────────────────────────────
  {
    id: "http-404",
    errorType: "HTTPNotFound",
    language: "API",
    patterns: [/404 Not Found/i, /Error: 404/i, /status.*404/i, /http.*404/i],
    rootCause: "The requested resource or API endpoint does not exist on the server.",
    confidenceBonus: 22,
    priority: "Medium",
    explanation: [
      "The server returned a 404 status, meaning the requested URL or resource was not found.",
      "Common causes: wrong URL, deleted resource, misconfigured routes, or missing API version prefix.",
      "Double-check the request URL, HTTP method, and base path configuration.",
    ],
    fixes: [
      {
        title: "Verify the endpoint URL",
        description: "Ensure the path matches the server route definition.",
        codeSnippet: `# Test with curl\ncurl -v https://api.example.com/v1/users\n\n# Check available routes (Express.js)\napp._router.stack.forEach(r => r.route && console.log(r.route.path));`,
        language: "bash",
      },
      {
        title: "Add a catch-all 404 handler",
        description: "Return helpful 404 responses in Express.js.",
        codeSnippet: `// Place this AFTER all other routes\napp.use((req, res) => {\n  res.status(404).json({ error: 'Not Found', path: req.path });\n});`,
        language: "javascript",
      },
    ],
    stackOverflowLinks: [
      { title: "Express.js 404 handling", url: "https://stackoverflow.com/questions/6528876/how-to-redirect-404-errors-to-a-page-in-expressjs" },
    ],
  },

  // ─── HTTP 500 ─────────────────────────────────────────────────────────
  {
    id: "http-500",
    errorType: "InternalServerError",
    language: "API",
    patterns: [/500 Internal Server Error/i, /Error: 500/i, /status.*500/i, /internal server error/i],
    rootCause: "The server encountered an unhandled exception while processing the request.",
    confidenceBonus: 20,
    priority: "Critical",
    explanation: [
      "The server crashed or threw an unhandled error during request processing.",
      "Check the server logs for the full stack trace and error message.",
      "Common causes: unhandled promise rejection, missing try/catch, or database error during request.",
    ],
    fixes: [
      {
        title: "Add global error handler in Express",
        description: "Catch all unhandled errors before they crash the server.",
        codeSnippet: `app.use((err, req, res, next) => {\n  console.error(err.stack);\n  res.status(500).json({ error: 'Internal Server Error', message: err.message });\n});`,
        language: "javascript",
      },
      {
        title: "Wrap async routes with try/catch",
        description: "Always handle errors in async route handlers.",
        codeSnippet: `app.get('/users', async (req, res, next) => {\n  try {\n    const users = await db.getUsers();\n    res.json(users);\n  } catch (err) {\n    next(err);\n  }\n});`,
        language: "javascript",
      },
    ],
    stackOverflowLinks: [
      { title: "Express.js error handling best practices", url: "https://stackoverflow.com/questions/29700005/express-4-middleware-error-handler" },
    ],
  },

  // ─── CORS Error ───────────────────────────────────────────────────────
  {
    id: "cors",
    errorType: "CORSError",
    language: "API",
    patterns: [
      /CORS/i,
      /Access-Control-Allow-Origin/i,
      /has been blocked by CORS policy/i,
      /Cross-Origin Request Blocked/i,
    ],
    rootCause: "The browser blocked a cross-origin request because the server did not include the required CORS headers.",
    confidenceBonus: 28,
    priority: "High",
    explanation: [
      "The browser enforces CORS (Cross-Origin Resource Sharing) as a security policy.",
      "The server response is missing the Access-Control-Allow-Origin header.",
      "This is a server-side configuration issue — the server must explicitly allow the requesting origin.",
    ],
    fixes: [
      {
        title: "Enable CORS in Express.js",
        description: "Use the cors middleware package to add proper headers.",
        codeSnippet: `const cors = require('cors');\n\n// Allow all origins (development only)\napp.use(cors());\n\n// Allow specific origin (production)\napp.use(cors({ origin: 'https://yourapp.com' }));`,
        language: "javascript",
      },
      {
        title: "Handle preflight OPTIONS requests",
        description: "Ensure OPTIONS requests are handled correctly.",
        codeSnippet: `app.options('*', cors());\napp.use(cors({\n  origin: process.env.ALLOWED_ORIGIN,\n  methods: ['GET', 'POST', 'PUT', 'DELETE'],\n  allowedHeaders: ['Content-Type', 'Authorization'],\n}));`,
        language: "javascript",
      },
    ],
    stackOverflowLinks: [
      { title: "XMLHttpRequest blocked by CORS policy", url: "https://stackoverflow.com/questions/43871637/no-access-control-allow-origin-header-is-present-on-the-requested-resource-whe" },
      { title: "How does CORS work?", url: "https://stackoverflow.com/questions/10636611/how-does-the-access-control-allow-origin-header-work" },
    ],
  },

  // ─── SyntaxError (JavaScript/JSON) ───────────────────────────────────
  {
    id: "syntax-error",
    errorType: "SyntaxError",
    language: "JavaScript",
    patterns: [/SyntaxError: Unexpected token/i, /SyntaxError: Unexpected end of JSON/i, /SyntaxError:/i, /JSON\.parse.*SyntaxError/i],
    rootCause: "The JavaScript engine encountered invalid syntax, or JSON.parse received malformed JSON.",
    confidenceBonus: 25,
    priority: "High",
    explanation: [
      "The parser encountered unexpected characters or tokens.",
      "If it's a JSON.parse error, the response body might be an HTML error page instead of JSON.",
      "Check the raw response body before parsing, and validate JSON with a linter.",
    ],
    fixes: [
      {
        title: "Validate JSON before parsing",
        description: "Wrap JSON.parse in a try/catch and check content-type.",
        codeSnippet: `try {\n  const data = JSON.parse(responseText);\n} catch (e) {\n  console.error('Invalid JSON:', responseText.substring(0, 200));\n}`,
        language: "javascript",
      },
      {
        title: "Check API response content-type",
        description: "Ensure the server returns application/json.",
        codeSnippet: `const res = await fetch('/api/data');\nif (!res.headers.get('content-type')?.includes('application/json')) {\n  throw new Error('Expected JSON, got: ' + await res.text());\n}\nconst data = await res.json();`,
        language: "javascript",
      },
    ],
    stackOverflowLinks: [
      { title: "SyntaxError: Unexpected token in JSON", url: "https://stackoverflow.com/questions/35750843/syntaxerror-unexpected-token-in-json-at-position-0" },
    ],
  },

  // ─── System — CPU high / timeout ─────────────────────────────────────
  {
    id: "cpu-high",
    errorType: "SystemError",
    language: "System",
    patterns: [/CPU usage/i, /high cpu/i, /100% cpu/i, /cpu spike/i, /process.*unresponsive/i],
    rootCause: "CPU usage is extremely high, causing the process to become unresponsive or slow.",
    confidenceBonus: 20,
    priority: "Critical",
    explanation: [
      "A process is consuming excessive CPU, impacting overall system performance.",
      "Common causes: infinite loop, inefficient algorithm on large data, missing pagination, or CPU-intensive synchronous operation blocking the event loop.",
      "Profile with node --prof or a system profiler to identify the hot path.",
    ],
    fixes: [
      {
        title: "Profile with node --prof",
        description: "Generate a V8 CPU profile to find the bottleneck.",
        codeSnippet: `node --prof app.js\n# After running, process the log\nnode --prof-process isolate-*.log > processed.txt`,
        language: "bash",
      },
      {
        title: "Offload CPU-intensive work",
        description: "Use worker threads for CPU-heavy operations.",
        codeSnippet: `const { Worker } = require('worker_threads');\nconst worker = new Worker('./heavy-task.js', { workerData: { input } });\nworker.on('message', result => console.log(result));`,
        language: "javascript",
      },
    ],
    stackOverflowLinks: [
      { title: "Node.js high CPU usage debugging", url: "https://stackoverflow.com/questions/1911459/node-js-high-cpu-usage" },
    ],
  },

  // ─── Unhandled Promise Rejection (Node.js) ────────────────────────────
  {
    id: "unhandled-promise",
    errorType: "UnhandledPromiseRejection",
    language: "Node.js",
    patterns: [/UnhandledPromiseRejectionWarning/i, /unhandledRejection/i, /Unhandled promise rejection/i],
    rootCause: "A Promise was rejected but no .catch() handler or try/catch block was present to handle the error.",
    confidenceBonus: 27,
    priority: "High",
    explanation: [
      "An async operation failed but the rejection was never caught.",
      "In newer Node.js versions, unhandled rejections crash the process.",
      "Every Promise chain needs either a .catch() or be inside an async function wrapped in try/catch.",
    ],
    fixes: [
      {
        title: "Add .catch() to Promise chains",
        description: "Always handle rejections at the end of a promise chain.",
        codeSnippet: `fetchData()\n  .then(processData)\n  .catch(err => {\n    console.error('Operation failed:', err);\n  });`,
        language: "javascript",
      },
      {
        title: "Use async/await with try/catch",
        description: "Wrap async operations in try/catch blocks.",
        codeSnippet: `async function run() {\n  try {\n    const data = await fetchData();\n    await processData(data);\n  } catch (err) {\n    console.error('Failed:', err);\n  }\n}`,
        language: "javascript",
      },
      {
        title: "Global unhandledRejection handler",
        description: "Catch any missed rejections at the process level.",
        codeSnippet: `process.on('unhandledRejection', (reason, promise) => {\n  console.error('Unhandled Rejection at:', promise, 'reason:', reason);\n  process.exit(1);\n});`,
        language: "javascript",
      },
    ],
    stackOverflowLinks: [
      { title: "Node.js UnhandledPromiseRejectionWarning", url: "https://stackoverflow.com/questions/40920179/should-i-refrain-from-handling-promise-rejection-asynchronously" },
    ],
  },
];

// Generic fallback patterns for language detection
const LANGUAGE_HINTS: Array<{ patterns: RegExp[]; language: string }> = [
  { patterns: [/\.py['":\s]|python|traceback \(most recent call last\)/i], language: "Python" },
  { patterns: [/\.java|at com\.|at org\.|at java\./i], language: "Java" },
  { patterns: [/\.js['":\s]|javascript|node\.js|nodejs|require\(|module\.exports/i], language: "JavaScript" },
  { patterns: [/\.ts['":\s]|typescript/i], language: "TypeScript" },
  { patterns: [/mysql|postgres|postgresql|mongodb|sqlite|redis/i], language: "Database" },
  { patterns: [/nginx|apache|http\/|curl|fetch|axios/i], language: "API" },
];

function detectLanguage(input: string): string {
  for (const hint of LANGUAGE_HINTS) {
    if (hint.patterns.some((p) => p.test(input))) {
      return hint.language;
    }
  }
  return "Unknown";
}

export function analyzeError(input: string): AnalysisOutput {
  let bestMatch: ErrorPattern | null = null;
  let bestScore = 0;

  for (const pattern of ERROR_PATTERNS) {
    let score = 0;
    for (const regex of pattern.patterns) {
      if (regex.test(input)) {
        score += pattern.confidenceBonus;
      }
    }
    if (score > bestScore) {
      bestScore = score;
      bestMatch = pattern;
    }
  }

  if (bestMatch) {
    // Cap confidence: start from bonus score, add length-based bonus
    const lengthBonus = Math.min(input.length / 100, 10);
    const rawConfidence = Math.min(bestScore + lengthBonus, 95);
    const confidenceScore = Math.round(rawConfidence);

    return {
      errorType: bestMatch.errorType,
      language: bestMatch.language,
      rootCause: bestMatch.rootCause,
      confidenceScore,
      priority: bestMatch.priority,
      explanation: bestMatch.explanation,
      fixes: bestMatch.fixes,
      stackOverflowLinks: bestMatch.stackOverflowLinks,
    };
  }

  // Fallback: generic analysis
  const language = detectLanguage(input);
  const hasStackTrace = /at \w+|File "|Traceback|line \d+/i.test(input);
  const hasError = /error|exception|fatal|fail/i.test(input);

  return {
    errorType: "UnknownError",
    language,
    rootCause:
      "The exact error pattern could not be matched. Manual inspection of the full stack trace is recommended.",
    confidenceScore: hasStackTrace ? 35 : hasError ? 20 : 10,
    priority: "Medium",
    explanation: [
      "The analyzer could not identify a known error pattern in the provided input.",
      "Ensure the full error message and stack trace are included.",
      hasStackTrace
        ? "A stack trace was detected — trace the top frame to find the root cause."
        : "No stack trace detected. Add logging around the failing operation.",
      "Search the exact error message on Stack Overflow or GitHub Issues for more context.",
    ],
    fixes: [
      {
        title: "Add detailed logging",
        description: "Log the full error object and context around the failure.",
        codeSnippet: `// Node.js\nconsole.error('Operation failed:', err.message, err.stack);\n\n// Python\nimport traceback\ntraceback.print_exc()`,
        language: "javascript",
      },
      {
        title: "Search for the exact error",
        description: "Copy the error message and search Stack Overflow.",
        codeSnippet: `# Copy the first line of the error and search:\n# site:stackoverflow.com "exact error message"`,
        language: "bash",
      },
      {
        title: "Check recent changes",
        description: "Review what changed recently that might have triggered this error.",
        codeSnippet: `git log --oneline -10\ngit diff HEAD~1`,
        language: "bash",
      },
    ],
    stackOverflowLinks: [
      { title: "How to debug errors effectively", url: "https://stackoverflow.com/questions/1385521/how-to-approach-debugging" },
      { title: "Reading and understanding stack traces", url: "https://stackoverflow.com/questions/3988788/what-is-a-stack-trace-and-how-can-i-use-it-to-debug-my-application-errors" },
    ],
  };
}
