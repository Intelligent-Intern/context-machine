# Tree-Sitter Setup for Python Parser

## Quick Setup

1. **Clone and build tree-sitter-python grammar:**

```bash
cd /tmp
git clone --depth=1 --branch=v0.20.4 https://github.com/tree-sitter/tree-sitter-python
```

2. **Build the shared library:**

```python
from tree_sitter import Language

lib_path = "/tmp/tree-sitter-python.so"
Language.build_library(lib_path, ["/tmp/tree-sitter-python"])
```

3. **Set environment variable:**

```bash
export TREE_SITTER_LIB=/tmp/tree-sitter-python.so
```

4. **Test:**

```python
from service.parsers import get_parser

parser = get_parser("python")
result = parser.parse(code, path="test.py")

# Should detect all edge types:
# CALLS, EXTENDS, IMPLEMENTS, DECORATES, OVERRIDES
# RAISES, CATCHES, YIELDS, RETURNS, ASYNC_AWAITS
# INSTANTIATES, DEFINES, READS, WRITES, WITH_CONTEXT
```

## Version Compatibility

- **tree-sitter**: 0.21.3 (Python package)
- **tree-sitter-python grammar**: v0.20.4 (ABI version 14)

Newer grammar versions (v0.21+) use ABI v15 which is incompatible with tree-sitter 0.21.3.

## Production Setup

### Option 1: Docker (Recommended)

Add to Dockerfile:

```dockerfile
RUN pip install tree-sitter==0.21.3

# Build tree-sitter-python
RUN git clone --depth=1 --branch=v0.20.4 https://github.com/tree-sitter/tree-sitter-python /tmp/ts-python && \
    python3 -c "from tree_sitter import Language; Language.build_library('/usr/local/lib/tree-sitter-python.so', ['/tmp/ts-python'])"

ENV TREE_SITTER_LIB=/usr/local/lib/tree-sitter-python.so
```

### Option 2: Build Script

Create `scripts/build_tree_sitter.sh`:

```bash
#!/bin/bash
set -e

# Destination for library
LIB_DIR="${LIB_DIR:-/usr/local/lib}"
GRAMMAR_VERSION="${GRAMMAR_VERSION:-v0.20.4}"

echo "Building tree-sitter-python ${GRAMMAR_VERSION}..."

# Clone grammar
TMP_DIR=$(mktemp -d)
git clone --depth=1 --branch=${GRAMMAR_VERSION} \
    https://github.com/tree-sitter/tree-sitter-python \
    "${TMP_DIR}/tree-sitter-python"

# Build library
python3 << EOF
from tree_sitter import Language
Language.build_library(
    "${LIB_DIR}/tree-sitter-python.so",
    ["${TMP_DIR}/tree-sitter-python"]
)
EOF

echo "✓ Built: ${LIB_DIR}/tree-sitter-python.so"
echo "  Set: export TREE_SITTER_LIB=${LIB_DIR}/tree-sitter-python.so"

# Cleanup
rm -rf "${TMP_DIR}"
```

Run:
```bash
chmod +x scripts/build_tree_sitter.sh
./scripts/build_tree_sitter.sh
export TREE_SITTER_LIB=/usr/local/lib/tree-sitter-python.so
```

## Fallback Behavior

If tree-sitter is not available, the parser falls back to regex mode:
- ✓ Still extracts functions and classes
- ✓ Still finds imports
- ✗ No advanced edge detection (CALLS, EXTENDS, etc.)
- ✗ Less accurate symbol extraction

## Troubleshooting

### "tree-sitter not available" warning

The parser is falling back to regex mode. Check:

1. Is `TREE_SITTER_LIB` set?
   ```bash
   echo $TREE_SITTER_LIB
   ```

2. Does the file exist?
   ```bash
   ls -lh $TREE_SITTER_LIB
   ```

3. Is tree-sitter installed?
   ```bash
   pip show tree-sitter
   ```

### "Incompatible Language version" error

The grammar version is too new for your tree-sitter version. Use grammar v0.20.4:

```bash
git clone --depth=1 --branch=v0.20.4 https://github.com/tree-sitter/tree-sitter-python
```

### Parser still only finds IMPORTS

Make sure the language is being loaded:

```python
from service.parsers import _TS_LANGS
print("Loaded languages:", list(_TS_LANGS.keys()))
print("Python:", _TS_LANGS.get("python"))
```

Should output:
```
Loaded languages: ['python']
Python: <tree_sitter.Language object at 0x...>
```

## Adding More Languages

To add support for other languages (JavaScript, Rust, etc.):

1. **Clone the grammar:**
   ```bash
   git clone --depth=1 --branch=<compatible-version> \
       https://github.com/tree-sitter/tree-sitter-<language>
   ```

2. **Build multi-language library:**
   ```python
   from tree_sitter import Language

   Language.build_library(
       '/tmp/languages.so',
       [
           '/tmp/tree-sitter-python',
           '/tmp/tree-sitter-javascript',
           '/tmp/tree-sitter-rust',
       ]
   )
   ```

3. **Load multiple languages:**
   The `_load_ts_languages()` function automatically tries to load all configured languages from the `.so` file.

## Performance

Tree-sitter parsing is fast:
- ~1000 lines/sec for Python code
- Scales linearly with file size
- Minimal memory overhead

The compiled `.so` file is ~100KB per language.
