// Job detail loading state: skeleton stat cells and table rows.
import Topbar from "../../../components/Topbar.js";

export default function Loading() {
  return (
    <>
      <Topbar variant="app" active="/dashboard" />
      <main className="wrap">
        <div className="page-head">
          <div className="page-head-text">
            <h1 className="title"><span className="skeleton" style={{ display: "inline-block", width: 200, height: 24 }}>&nbsp;</span></h1>
          </div>
        </div>
        <div className="stat-strip" style={{ marginBottom: 16 }}>
          {[0, 1, 2, 3, 4].map((i) => (
            <div key={i} className="stat"><div className="skeleton" style={{ height: 28 }}>&nbsp;</div></div>
          ))}
        </div>
        <div className="table-wrap">
          <table className="table">
            <tbody>
              {[0, 1, 2, 3, 4].map((i) => (
                <tr key={i} className="is-loading">
                  <td colSpan={5}><div className="skeleton" style={{ height: 24 }}>&nbsp;</div></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>
    </>
  );
}
