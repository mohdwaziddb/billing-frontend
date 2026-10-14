import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Database, LoaderCircle } from "lucide-react";
import { getBizioConsoleTables, runBizioConsoleQuery, type BizioConsoleQueryResult } from "../api/bizioConsole";
import { useAuth } from "../context/AuthContext";
import { getApiErrorMessage } from "../lib/errors";

const formatCell = (value: unknown): string => {
  if (value === null || value === undefined) {
    return "NULL";
  }
  if (typeof value === "object") {
    try {
      return JSON.stringify(value);
    } catch {
      return String(value);
    }
  }
  return String(value);
};

export const BizioConsolePage = () => {
  const { user, logout } = useAuth();
  const [sql, setSql] = useState("SELECT * FROM users LIMIT 20");
  const [running, setRunning] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<BizioConsoleQueryResult | null>(null);
  const [tables, setTables] = useState<string[]>([]);
  const [lockedDb, setLockedDb] = useState("");

  useEffect(() => {
    document.title = "BizioConsole | Bizio Technologies";
  }, []);

  useEffect(() => {
    let cancelled = false;
    getBizioConsoleTables()
      .then((data) => {
        if (cancelled) {
          return;
        }
        setTables(data.tables);
        setLockedDb(data.databaseName);
      })
      .catch(() => {
        if (!cancelled) {
          setTables([]);
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const run = async () => {
    if (running || !sql.trim()) {
      return;
    }
    try {
      setRunning(true);
      setError("");
      const data = await runBizioConsoleQuery(sql);
      setResult(data);
      setLockedDb(data.databaseName);
    } catch (err) {
      setResult(null);
      setError(getApiErrorMessage(err, "Query failed"));
    } finally {
      setRunning(false);
    }
  };

  const insertTableQuery = (table: string) => {
    setSql(`SELECT * FROM ${table} LIMIT 20`);
  };

  return (
    <div className="flex min-h-screen flex-col bg-slate-100" style={{ fontFamily: "Manrope, Inter, system-ui, sans-serif" }}>
      <header className="flex flex-wrap items-center gap-3 border-b border-slate-200 bg-white px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-900 text-white">
            <Database size={18} />
          </span>
          <div>
            <h1 className="text-lg font-bold leading-tight text-slate-900">BizioConsole</h1>
            <p className="text-xs text-slate-500">Super-admin SQL console · SELECT only</p>
          </div>
        </div>
        <span className="ml-1 inline-flex items-center gap-1 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-200">
          <span className="h-2 w-2 rounded-full bg-emerald-500" />
          Locked DB: {lockedDb || user?.company?.databaseName || user?.company?.code || "…"}
        </span>
        <div className="ml-auto flex items-center gap-3">
          <span className="hidden text-xs text-slate-500 sm:inline">{user?.username || user?.email}</span>
          <Link to="/dashboard" className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50">
            Dashboard
          </Link>
          <button onClick={() => void logout()} className="rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-700">
            Logout
          </button>
        </div>
      </header>

      <div className="grid flex-1 gap-4 p-4 lg:grid-cols-[240px_1fr]">
        <aside className="h-fit rounded-xl border border-slate-200 bg-white p-3 lg:sticky lg:top-4">
          <h2 className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500">Tables ({tables.length})</h2>
          {tables.length === 0 ? (
            <p className="text-xs text-slate-400">No tables loaded.</p>
          ) : (
            <ul className="max-h-[60vh] space-y-1 overflow-auto">
              {tables.map((table) => (
                <li key={table}>
                  <button
                    onClick={() => insertTableQuery(table)}
                    className="w-full truncate rounded-md px-2 py-1.5 text-left font-mono text-xs text-slate-700 hover:bg-slate-100"
                    title={`SELECT * FROM ${table} LIMIT 20`}
                  >
                    {table}
                  </button>
                </li>
              ))}
            </ul>
          )}
          <p className="mt-3 border-t border-slate-100 pt-2 text-[11px] leading-relaxed text-slate-400">
            Only the locked database is queried. Cross-database access is blocked.
          </p>
        </aside>

        <main className="flex min-w-0 flex-col gap-4">
          <section className="rounded-xl border border-slate-200 bg-white p-3">
            <textarea
              value={sql}
              onChange={(e) => setSql(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  void run();
                }
              }}
              rows={6}
              spellCheck={false}
              placeholder="SELECT * FROM users LIMIT 20"
              className="w-full resize-y rounded-lg border border-slate-200 bg-slate-950 p-3 font-mono text-sm leading-6 text-emerald-100 caret-emerald-400 outline-none placeholder:text-slate-500 selection:bg-emerald-500 selection:text-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/40"
            />
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <button
                onClick={() => void run()}
                disabled={running || !sql.trim()}
                className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-500 disabled:opacity-50"
              >
                {running && <LoaderCircle size={16} className="animate-spin" />}
                {running ? "Running…" : "Run Query (Enter)"}
              </button>
              <span className="text-xs text-slate-400">Enter: run · Shift+Enter: new line · SELECT / SHOW / DESCRIBE / EXPLAIN only · max 500 rows · 15s timeout</span>
            </div>
            {error && (
              <p className="mt-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 ring-1 ring-red-200">{error}</p>
            )}
          </section>

          {result && (
            <section className="rounded-xl border border-slate-200 bg-white p-3">
              <div className="mb-2 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                <span className="font-semibold text-slate-700">{result.rowCount} rows</span>
                <span>·</span>
                <span>{result.executedInMs} ms</span>
                {result.truncated && <span className="rounded-full bg-amber-50 px-2 py-0.5 font-semibold text-amber-700 ring-1 ring-amber-200">Truncated to {result.maxRows} rows</span>}
              </div>
              {result.columns.length === 0 ? (
                <p className="text-sm text-slate-400">Query ran successfully, no rows returned.</p>
              ) : (
                <div className="overflow-auto rounded-lg border border-slate-200" style={{ maxHeight: "55vh" }}>
                  <table className="min-w-full border-collapse text-left text-xs">
                    <thead className="sticky top-0 bg-slate-900 text-white">
                      <tr>
                        {result.columns.map((col) => (
                          <th key={col} className="whitespace-nowrap px-3 py-2 font-mono font-semibold">{col}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {result.rows.map((row, i) => (
                        <tr key={i} className={i % 2 === 0 ? "bg-white" : "bg-slate-50"}>
                          {result.columns.map((col) => (
                            <td key={col} className="max-w-[320px] truncate whitespace-nowrap px-3 py-1.5 font-mono text-slate-700" title={formatCell(row[col])}>
                              {formatCell(row[col])}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          )}
        </main>
      </div>
    </div>
  );
};
