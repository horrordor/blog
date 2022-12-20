set -ex

CN_SITE="_site"
LATEST_VERSION="latest"
OUTPUT_BRANCH="docs_output"

CN_OPTIONS="--prefix ${CN_SITE} -b ${OUTPUT_BRANCH}"

mike delete --all ${CN_OPTIONS}
git checkout master
mike deploy master ${LATEST_VERSION} -u ${CN_OPTIONS}
mike set-default ${LATEST_VERSION} ${CN_OPTIONS}
