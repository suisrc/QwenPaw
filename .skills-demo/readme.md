# 说明

## 开发环境初始化

路径说明： $QWENPAW_WORKING_DIR 和 $QWENPAW_SECRET_DIR 是环境变量，默认值分别为 ~/.qwenpaw 和 ~/.qwenpaw.secret。  

```sh
cat > pyproject.toml <<EOF

[[tool.uv.index]]
url = "https://mirrors.tuna.tsinghua.edu.cn/pypi/web/simple"
default = true

EOF

uv sync
```

已开发模式启动

```sh

# 前端依赖安装
cd console
npm ci --include=dev
npm run dev


# 后端依赖安装
source .venv/bin/activate
mkdir -p .qwenpaw .qwenpaw.secret
export QWENPAW_WORKING_DIR=.qwenpaw
export QWENPAW_SECRET_DIR=.qwenpaw.secret
python -m qwenpaw init --defaults (只在第一次运行时需要执行)
python -m qwenpaw app --reload

# --------------------------------------------------------------

# 前端开发模式启动(新终端, 需要在根目录执行)
cd console && npm run dev

# 后端开发模式启动
## 新终端需要重新激活虚拟环境
source .venv/bin/activate
## 启动后端服务 --reload(development mode)
QWENPAW_WORKING_DIR=.qwenpaw QWENPAW_SECRET_DIR=.qwenpaw.secret python -m qwenpaw app --reload

```


## weather-query 

技能使用 `wttr.in` 的 `j2` JSON 接口查询天气数据，返回标准化结果供技能调用。  
这只是一个示例技能，用于开发者学习如何编写技能脚本，实际使用中可以根据需要调整数据来源和返回格式。  
