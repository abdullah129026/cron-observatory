// Dashboard loading state: five skeleton rows inside the table frame.
import Topbar from "../../components/Topbar.js";

export default function Loading() {
  return (
    <>
      <Topbar variant="app" active="/dashboard" />
      <main className="wrap">
        <div className="page-head">
          <div className="page-head-text">
            <h1 className="title">Jobs</h1>
            <p className="caption">Loading jobs.</p>
          </div>
        </div>
        <div className="table-wrap">
          <table className="table">
            <tbody>
              {[0, 1, 2, 3, 4].map((i) => (
                <tr key={i} className="is-loading">
                  <td colSpan={7}><div className="skeleton" style={{ height: 24 }}>&nbsp;</div></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>
    </>
  );
}
