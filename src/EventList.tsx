import Table from "react-bootstrap/Table";
import Button from "react-bootstrap/Button";
import Badge from "react-bootstrap/Badge";
import { Pencil, Trash, Hourglass, CheckCircle, SortDown, SortUp } from "react-bootstrap-icons";
import { useState } from "react";
import type { EventData, EventListProps } from "./types/types";

function EventList({ events, onEdit, onDelete }: EventListProps) {
  const [showUrl, setShowUrl] = useState<boolean>(false);
  const [sortField, setSortField] = useState<string>("time");
  const [sortAsc, setSortAsc] = useState<boolean>(false); // 時刻は降順（新しい順）がデフォルト

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(true);
    }
  };

  const sortedEvents: EventData[] = [...events].sort((a: EventData, b: EventData) => {
    let aValue: any;
    let bValue: any;

    switch (sortField) {
      case "time":
        aValue = new Date(a.time);
        bValue = new Date(b.time);
        break;
      case "title":
        aValue = a.title || "";
        bValue = b.title || "";
        break;
      case "body":
        aValue = a.body || "";
        bValue = b.body || "";
        break;
      case "url":
        aValue = a.url || "";
        bValue = b.url || "";
        break;
      case "sent":
        aValue = a.sent ? 1 : 0;
        bValue = b.sent ? 1 : 0;
        break;
      default:
        return 0;
    }

    if (aValue < bValue) return sortAsc ? -1 : 1;
    if (aValue > bValue) return sortAsc ? 1 : -1;
    return 0;
  });

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
            <th className="text-nowrap">
              開始時刻{" "}
              <Button
                variant="link"
                size="sm"
                className="p-0 align-baseline"
                onClick={() => handleSort("time")}
                title="開始時刻で並び替え"
              >
                <span className={sortField === "time" ? "text-primary" : "text-muted"}>
                  {sortField === "time" ? (sortAsc ? <SortUp /> : <SortDown />) : <SortDown />}
                </span>
              </Button>
            </th>
            <th className="text-nowrap">
              タイトル{" "}
              <Button
                variant="link"
                size="sm"
                className="p-0 align-baseline"
                onClick={() => handleSort("title")}
                title="タイトルで並び替え"
              >
                <span className={sortField === "title" ? "text-primary" : "text-muted"}>
                  {sortField === "title" ? (sortAsc ? <SortUp /> : <SortDown />) : <SortDown />}
                </span>
              </Button>
            </th>
            <th className="text-nowrap">
              本文{" "}
              <Button
                variant="link"
                size="sm"
                className="p-0 align-baseline"
                onClick={() => handleSort("body")}
                title="本文で並び替え"
              >
                <span className={sortField === "body" ? "text-primary" : "text-muted"}>
                  {sortField === "body" ? (sortAsc ? <SortUp /> : <SortDown />) : <SortDown />}
                </span>
              </Button>
            </th>
            {showUrl && (
              <th className="text-nowrap">
                URL{" "}
                <Button
                  variant="link"
                  size="sm"
                  className="p-0 align-baseline"
                  onClick={() => handleSort("url")}
                  title="URLで並び替え"
                >
                  <span className={sortField === "url" ? "text-primary" : "text-muted"}>
                    {sortField === "url" ? (sortAsc ? <SortUp /> : <SortDown />) : <SortDown />}
                  </span>
                </Button>
              </th>
            )}
            <th className="text-nowrap">
              状態{" "}
              <Button
                variant="link"
                size="sm"
                className="p-0 align-baseline"
                onClick={() => handleSort("sent")}
                title="状態で並び替え"
              >
                <span className={sortField === "sent" ? "text-primary" : "text-muted"}>
                  {sortField === "sent" ? (sortAsc ? <SortUp /> : <SortDown />) : <SortDown />}
                </span>
              </Button>
            </th>
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
            sortedEvents.map((event: EventData) => (
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
