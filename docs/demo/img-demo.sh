#!/usr/bin/env bash
# Simulated Image Agency demo for VHS recording.
set -euo pipefail

BOLD='\033[1m'
DIM='\033[2m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
MAGENTA='\033[0;35m'
CYAN='\033[0;36m'
YELLOW='\033[0;33m'
RESET='\033[0m'

type_text() {
  local text="$1"
  local delay="${2:-0.03}"
  for ((i = 0; i < ${#text}; i++)); do
    printf '%s' "${text:$i:1}"
    sleep "$delay"
  done
}

print_slow() {
  echo -e "$1"
  sleep "${2:-0.35}"
}

clear
sleep 0.2

echo -e "${CYAN}"
cat <<'WORDMARK'
 _                 🖼️
(_)_ __ ___   __ _
| | '_ ` _ \ / _` |
| | | | | | | (_| |
|_|_| |_| |_|\__, |
             |___/
WORDMARK
echo -e "${RESET}"

print_slow "${DIM}    IMAGE AGENCY v0.1${RESET}" 0.25
print_slow "${DIM}    CONTEXT BUS ......... READY${RESET}" 0.2
print_slow "${DIM}    PLAN ENGINE ......... READY${RESET}" 0.2
print_slow "${DIM}    OPENAI GPT-IMAGE-2 .. READY${RESET}" 0.2
print_slow "${DIM}    GEMINI IMAGE ........ READY${RESET}" 0.2
print_slow ""
print_slow "${DIM}    READY.${RESET}" 0.2

sleep 1.7

clear
sleep 0.2
printf "${BOLD}${BLUE}>${RESET} "
type_text '/img review the 6 benefit cards and create on-brand versions of appropriate images for each one' 0.025
echo ""
sleep 0.5

print_slow ""
print_slow "${BOLD}${CYAN}🖼️ Image Agency activated${RESET} — project-aware image planning"
print_slow "  ${GREEN}✓${RESET} Found project config: ${BOLD}img.config.json${RESET}" 0.18
print_slow "  ${GREEN}✓${RESET} Detected asset type: ${BOLD}benefit-card${RESET} via aliases" 0.18
print_slow "  ${GREEN}✓${RESET} Found 6 repeated image slots in ${BOLD}src/components/Benefits.astro${RESET}" 0.18
print_slow "  ${GREEN}✓${RESET} Ratio: ${BOLD}4:3${RESET}  Output: ${BOLD}public/generated/benefits${RESET}" 0.18
print_slow ""
print_slow "${DIM}Clarification needed: delivery target${RESET}" 0.2
print_slow "  ${YELLOW}?${RESET} Generate to project assets, local review folder, or site insertion proposal?" 0.2
sleep 0.6
printf "${BOLD}${BLUE}>${RESET} "
type_text "project assets" 0.035
echo ""
sleep 0.4
print_slow ""
print_slow "  ${GREEN}✓${RESET} Plan id: ${DIM}e41c8f...${RESET}" 0.18
print_slow "  ${GREEN}✓${RESET} 6 prompts composed with brand pre-prompts and negative prompts" 0.18
print_slow "  ${GREEN}✓${RESET} Manifest: ${BOLD}public/generated/benefits/img-manifest.json${RESET}" 0.18

sleep 2.2

clear
sleep 0.2
printf "${BOLD}${BLUE}>${RESET} "
type_text '$img "create three launch social cards for the new member app"' 0.03
echo ""
sleep 0.5

print_slow ""
print_slow "${BOLD}${MAGENTA}🖼️ Image Agency for Codex: ${RESET}${BOLD}\$img${RESET}"
print_slow "  ${GREEN}✓${RESET} Loaded user defaults from ${BOLD}~/.config/img/config.json${RESET}" 0.18
print_slow "  ${GREEN}✓${RESET} Matched recipe: ${BOLD}social-media-post / product-marketing${RESET}" 0.18
print_slow "  ${GREEN}✓${RESET} Provider: ${BOLD}gpt-image-2${RESET}  Count: ${BOLD}3${RESET}" 0.18
print_slow "  ${GREEN}✓${RESET} Saved review assets to ${BOLD}~/Pictures/img/member-app-launch${RESET}" 0.18
print_slow ""
print_slow "${DIM}Attribution and final API prompts written to manifest.${RESET}" 0.2

sleep 2.5

clear
sleep 0.2
printf "${BOLD}${BLUE}>${RESET} "
type_text "/img setup" 0.04
echo ""
sleep 0.5

print_slow ""
print_slow "${BOLD}${CYAN}🖼️ Image Agency setup${RESET}"
print_slow "  ${GREEN}✓${RESET} User secrets: ${BOLD}~/.config/img/.env.local${RESET}" 0.18
print_slow "  ${GREEN}✓${RESET} Project profile: ${BOLD}img.config.json${RESET}" 0.18
print_slow "  ${GREEN}✓${RESET} Health check: provider keys present, output folders writable" 0.18
print_slow ""
print_slow "${DIM}Natural language in. Planned image work out.${RESET}" 0.25

sleep 3
