import ItemArt from "@/components/ItemArt";

interface Props {
  title: string;
  body: string;
}

/** 로그인/회원가입 화면 왼쪽의 소개 영역 */
export default function AuthAside({ title, body }: Props) {
  return (
    <aside className="auth-aside">
      <div className="kicker">상상 속 물건 경매</div>
      <div className="auth-art">
        <ItemArt kind="clock" size={200} />
      </div>
      <div className="auth-aside-copy">
        <h2>{title}</h2>
        <p>{body}</p>
      </div>
    </aside>
  );
}
