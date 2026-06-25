import { InteractionResponseType, MessageFlags, type DiscordInteraction, type Env } from "../types.js";

export function handleVersionCommand(interaction: DiscordInteraction, env: Env): Response {
  const version = env.VERSION_METADATA;
  if (!version) {
    return new Response(
      JSON.stringify({
        type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
        data: {
          content: "버전 메타데이터를 읽을 수 없습니다. 배포 설정을 확인해 주세요.",
          flags: MessageFlags.EPHEMERAL,
        },
      }),
      { headers: { "Content-Type": "application/json" } }
    );
  }

  const appVersion = env.APP_VERSION ?? "unknown";
  const uploadUnix = Math.floor(new Date(version.timestamp).getTime() / 1000);

  const lines = [
    "**현재 배포 정보**",
    `- 앱 버전: \`${appVersion}\``,
    `- 빌드 ID: \`${version.id}\``,
    `- 업로드 시각: <t:${uploadUnix}:f>`,
    "- 상태: 배포된 워커에서 정상 응답 중",
  ];

  return new Response(
    JSON.stringify({
      type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
      data: {
        content: lines.join("\n"),
        flags: MessageFlags.EPHEMERAL,
      },
    }),
    { headers: { "Content-Type": "application/json" } }
  );
}
