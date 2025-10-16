import Table from "react-bootstrap/Table";
import Button from "react-bootstrap/Button";
import Badge from "react-bootstrap/Badge";
import { Pencil, Trash, Hourglass, CheckCircle } from "react-bootstrap-icons";

function EventList({ events, onEdit, onDelete }: any) {
  return (
    <div className="mt-4">
      <h4>📅 登録済みイベント</h4>
      <Table striped bordered hover responsive className="align-middle">
        <thead className="table-light">
          <tr>
            <th>開始時刻</th>
            <th>タイトル</th>
            <th>本文</th>
            <th>URL</th>
            <th>状態</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          {events.length === 0 ? (
            <tr>
              <td colSpan={6} className="text-center text-muted">
                登録されたイベントはありません
              </td>
            </tr>
          ) : (
            events.map((event: any) => (
              <tr key={event.id}>
                <td>{new Date(event.time).toLocaleString()}</td>
                <td>{event.title}</td>
                <td>{event.body}</td>
                <td style={{ fontSize: "0.85rem", wordBreak: "break-all" }}>
                  <a href={event.url} target="_blank" rel="noreferrer">
                    {event.url}
                  </a>
                </td>
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
