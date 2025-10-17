import Table from "react-bootstrap/Table";
import Button from "react-bootstrap/Button";
import Badge from "react-bootstrap/Badge";
import { Pencil, Trash, Hourglass, CheckCircle, SortDown, SortUp } from "react-bootstrap-icons";
import { useState } from "react";

function EventList({ events, onEdit, onDelete }: any) {
  const [showUrl, setShowUrl] = useState(false);
  const [sortAsc, setSortAsc] = useState(true);

  const sortedEvents = showUrl
    ? [...events].sort((a, b) =>
        sortAsc
          ? (a.url || "").localeCompare(b.url || "")
          : (b.url || "").localeCompare(a.url || "")
      )
    : events;

  return (
    <div className="mt-4">
      <div className="d-flex justify-content-between align-items-center mb-2">
        <h4 className="mb-0">📅 登録済みイベント</h4>
        <Button
          variant={showUrl ? "outline-danger" : "outline-primary"}
          size="sm"
          onClick={() => setShowUrl(!showUrl)}
        >
          {showUrl ? "🔒 URLを隠す" : "🔗 URLを表示"}
        </Button>
      </div>

      <Table striped bordered hover responsive className="align-middle">
        <thead className="table-light">
          <tr>
            <th>開始時刻</th>
            <th>タイトル</th>
            <th>本文</th>
            {showUrl && (
              <th className="text-nowrap">
                URL{" "}
                <Button
                  variant="link"
                  size="sm"
                  className="p-0 align-baseline"
                  onClick={() => setSortAsc(!sortAsc)}
                  title="URLで並び替え"
                >
                  {sortAsc ? <SortDown /> : <SortUp />}
                </Button>
              </th>
            )}
            <th>状態</th>
            <th>操作</th>
          </tr>
        </thead>

        <tbody>
          {sortedEvents.length === 0 ? (
            <tr>
              <td colSpan={showUrl ? 6 : 5} className="text-center text-muted">
                登録されたイベントはありません
              </td>
            </tr>
          ) : (
            sortedEvents.map((event: any) => (
              <tr key={event.id}>
                <td>{new Date(event.time).toLocaleString()}</td>
                <td>{event.title}</td>
                <td>{event.body}</td>

                {showUrl && (
                  <td style={{ fontSize: "0.85rem", wordBreak: "break-all" }}>
                    <a href={event.url} target="_blank" rel="noreferrer">
                      {event.url}
                    </a>
                  </td>
                )}

                <td>
                  {event.sent ? (
                    <Badge bg="success">
                      <CheckCircle className="me-1" /> 送信済
                    </Badge>
                  ) : (
                    <Badge bg="warning" text="dark">
                      <Hourglass className="me-1" /> 待機中
                    </Badge>
                  )}
                </td>

                <td className="text-center">
                  <Button
                    variant="outline-primary"
                    size="sm"
                    className="me-2"
                    onClick={() => onEdit(event)}
                  >
                    <Pencil />
                  </Button>
                  <Button
                    variant="outline-danger"
                    size="sm"
                    onClick={() => onDelete(event.id)}
                  >
                    <Trash />
                  </Button>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </Table>
    </div>
  );
}

export default EventList;
