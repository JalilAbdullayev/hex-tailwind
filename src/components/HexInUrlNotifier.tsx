import { hexCodeInUrlStore } from "../hexCodeInUrlStore";
import { parseVersionParam } from "../utils/colors";

export default function HexCodeInUrlNotifier() {
  const urlSearchParams = new URLSearchParams(window.location.search);
  const hexCodeInUrl = urlSearchParams.get("hex");
  const versionInUrl = parseVersionParam(urlSearchParams.get("v"));

  if (hexCodeInUrl) {
    hexCodeInUrlStore.set({
      color: hexCodeInUrl,
      version: versionInUrl ?? "",
    });
  }

  return <></>;
}
