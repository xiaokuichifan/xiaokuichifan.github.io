---
title: "3DGS 数据准备实战：从手机拍摄到 COLMAP 位姿的完整流程"
date: 2026-11-26
description: "手把手梳理 3D Gaussian Splatting 数据准备全流程：涵盖拍摄规范、FFmpeg 抽帧与去模糊、COLMAP SfM 与去畸变、公开数据集练手、LiDAR/SLAM 位姿转换及常见报错排查。"
tags: ["3DGS", "COLMAP", "三维重建", "SfM"]
draft: false
---

用 3D Gaussian Splatting（3DGS）重建真实场景时，决定最终渲染上限的往往不是训练超参，而是前期的数据质量。输入图像模糊、相机畸变未去除、位姿漂移哪怕一点点，训练出来的场景就会出现重影、糊边或大量浮空噪点（Floaters）。

本文按实际工程顺序，把从手机拍摄、视频抽帧筛选、COLMAP 运动恢复结构（Structure-from-Motion, SfM）与去畸变，到公开数据集练手、外部 LiDAR/SLAM 位姿转换和常见坑排查完整走一遍。

## 3DGS 训练到底需要哪些输入

以原版 3DGS 论文 *3D Gaussian Splatting for Real-Time Radiance Field Rendering*（Kerbl et al., SIGGRAPH 2023，[arXiv:2308.04079](https://arxiv.org/abs/2308.04079)）及其官方仓库 [graphdeco-inria/gaussian-splatting](https://github.com/graphdeco-inria/gaussian-splatting) 为例，训练脚本 `train.py` 核心依赖三样输入：

1. **去畸变图像（Undistorted Images）**
   标准 3DGS 的可微光栅化器默认建立在无畸变的针孔相机模型（Pinhole Camera Model）之上。手机或运动相机拍出的原图通常存在明显的径向畸变和切向畸变，如果不提前去畸变，图像边缘的像素投影位置与针孔模型不符，会导致优化阶段边缘始终无法对齐。因此送入训练的图像必须已经完成去畸变，且对应的相机模型为 `PINHOLE` 或 `SIMPLE_PINHOLE`。
2. **相机内参与外参（Camera Intrinsics & Extrinsics）**
   每个视角都需要精确的内参矩阵 $\mathbf{K}$ 和外参刚体变换 $(\mathbf{R}, \mathbf{t})$，将世界坐标系下的三维点 $\mathbf{p}_w = (X_w, Y_w, Z_w)^\top$ 投影到图像像素坐标 $(u, v)$：

   $$
   \mathbf{p}_c = \begin{bmatrix} X_c \\ Y_c \\ Z_c \end{bmatrix} = \mathbf{R}\mathbf{p}_w + \mathbf{t}, \qquad
   u = f_x \frac{X_c}{Z_c} + c_x, \qquad
   v = f_y \frac{Y_c}{Z_c} + c_y
   $$

   其中 $(f_x, f_y)$ 为像素单位的焦距，$(c_x, c_y)$ 为主点坐标；外参描述世界坐标系到相机坐标系（World-to-Camera）的旋转与平移。
3. **初始稀疏点云（Initial Sparse Point Cloud）**
   3DGS 直接使用稀疏点云的三维坐标和颜色来初始化每个三维高斯椭球（3D Gaussian）的位置与初始颜色（球谐函数的 $0$ 阶项），随后在训练中通过自适应密度控制（克隆、分裂与剪枝）逐步细化几何。虽然框架也支持随机点云初始化，但高质量的稀疏点云能显著加快收敛速度、减少局部极小值和浮空伪影。

在文件组织上，官方 `train.py` 默认读取 [COLMAP](https://github.com/colmap/colmap) 格式的数据目录（包含 `images/` 文件夹和 `sparse/0/` 下的相机、位姿与点云文件）。

## 拍摄要点

数据准备里最省钱、收益最高的优化环节其实是拍摄阶段。拍坏的素材很难靠后期算法救回来。

> 实拍环境【待补充：后续补上实拍使用的设备型号、分辨率/帧率、场景说明及轨迹示意图。】

### 视角重叠度与轨迹规划

- **保持高重叠度**：相邻两张图像之间建议保持 $70\%$～$80\%$ 以上的画面重叠，确保特征点在多帧中都能被稳定追踪和三角化。
- **多高度环绕覆盖**：拍单个物体或小型区域时，建议分低、中、高三层环绕拍摄（平视、俯视、仰视），避免顶部或底部出现信息盲区。
- **避免纯原地旋转**：只站在原地转动手机拍摄，相机光心几乎没有平移（基线趋近于零），SfM 无法可靠恢复深度。拍摄室内大空间时，应保持持续平移，并在结束时尽量回到起点附近形成闭环（Loop Closure），抑制累计漂移。

### 固定焦距、对焦与曝光

- **锁定镜头和焦距**：拍摄全程不要变焦，也尽量使用专业模式或第三方相机 App 固定使用主摄，防止手机在移动过程中自动在广角、主摄和长焦之间切换镜头。一旦等效焦距和传感器参数变化，就无法在 COLMAP 中安全地共享同一套相机内参。
- **锁定曝光与白平衡**：手机自动曝光（AE）和自动白平衡（AWB）在迎光/背光切换时会剧烈改变同一物体的颜色，破坏多视角亮度一致性。建议开启 AE/AF 锁定，关闭强烈的 HDR 动态色调映射。
- **慎用强电子防抖**：部分手机的超级防抖会逐帧做动态裁切与视角补偿，等效于不断微调主点和焦距；条件允许时关闭强防抖，改用稳定动作或手持云台。

### 避免运动模糊

- 尽量选择光线充足的环境，提高快门速度（例如 $1/200\,\text{s}$ 以上）以抑制拖影。
- 移动速度放慢，尤其是转弯和近距离绕拍时要减速；如果拍视频，尽量保持匀速推进。
- 静态单张连拍的单帧锐度通常高于视频录屏；如果场景较大必须用视频采集，则后续务必做模糊帧剔除。

### 弱纹理、反光与动态物体的处理

- **弱纹理表面**：大面积白墙、纯色桌面、光滑天花板很难提取稳定的局部特征点。拍摄时尽量让画面同时带入周围有纹理的背景参照物（家具边缘、地板拼缝等），必要时可在非关注区域临时贴少量标记点。
- **反光与透明材质**：玻璃、镜面、亮面金属的高光位置会随视角移动，违背 SfM 的多视角几何一致性假设，容易在重建结果中出现伪点或穿透错位。拍摄时尽量调整光源减少刺眼镜面反射，并从更多角度提供周围几何约束。
- **动态干扰**：行人、车辆、随风晃动的树叶和流动水面会引入误匹配或渲染鬼影。采集前尽量清场；无法避免时，后续需要在训练前准备对应的动态区域遮罩（Mask）。

## 视频抽帧和筛选

如果采集的是视频文件，第一步是用 [FFmpeg](https://ffmpeg.org/) 将视频转为图像序列，再按清晰度做筛选。

### 用 FFmpeg 抽帧并按移动速度选 `fps`

下面是一条常用的抽帧命令，按每秒 $2$ 帧提取高质量 JPEG 图像：

```bash
mkdir -p data/scene01/raw_frames

ffmpeg -i raw_video.mp4 \
  -vf "fps=2" \
  -qscale:v 2 \
  data/scene01/raw_frames/frame_%05d.jpg
```

参数说明：

- `-vf "fps=2"`：按固定每秒 $2$ 帧采样。`-qscale:v 2` 控制 JPEG 压缩质量（范围为 $2$～$31$，数值越小画质越高；如果硬盘空间充裕，也可直接输出 `.png` 无损格式）。如果跳过下一步的清晰度筛选，也可以直接把输出目录写成 `data/scene01/input/frame_%05d.jpg`。
- 如果原视频是 4K，想在抽帧阶段就顺便限制分辨率（例如横屏视频限制宽度不超过 $1920$ 像素、高度按比例自动取偶数），可以把滤镜改成 `-vf "fps=2,scale='min(1920,iw)':-2"`（竖屏视频则改为 `scale=-2:'min(1920,ih)'`）。

**如何根据移动速度选 `fps`？** 经验上，小型物体或桌面场景控制在 $80$～$150$ 帧、中等室内外场景控制在 $150$～$300$ 帧就足以跑出不错的效果，帧数过多反而会显著拉长 COLMAP 匹配时间：

- 若缓慢步行环拍一段 $60$ 秒的视频，选 `fps=2`～`3` 可得到 $120$～$180$ 帧；
- 若拍摄速度较快、视角变化剧烈，可先按稍高帧率（如 `fps=4`～`5`）抽帧，再通过清晰度筛选保留每个时间窗口内最清晰的一帧。

### 基于拉普拉斯方差剔除模糊帧

运动模糊会抹平图像中的高频边缘。借助 [OpenCV](https://opencv.org/) 对灰度图 $I$ 施加拉普拉斯算子（Laplacian）并计算其方差，可以快速估计单帧锐度：

$$
S(I) = \operatorname{Var}\!\left(\nabla^2 I\right)
$$

$S(I)$ 越低，图像越可能发生拖影模糊。不过需要注意，**不同视角的纹理丰富度本身就不同**（拍向白墙的一帧方差天然低于拍向书架的一帧）。因此除了全局阈值过滤外，更稳妥的工程做法是按时间顺序做**局部窗口择优**：每隔 $k$ 帧只保留拉普拉斯方差最高的那一帧，既能去除拖影，又能保证时间轴上的视角分布均匀。

下面是一个可直接运行的局部择优筛选脚本：

```python
from pathlib import Path
import shutil
import cv2

def laplacian_score(image_path: Path) -> float:
    gray = cv2.imread(str(image_path), cv2.IMREAD_GRAYSCALE)
    if gray is None:
        return -1.0
    return float(cv2.Laplacian(gray, cv2.CV_64F).var())

def select_sharp_frames(
    src_dir: str,
    dst_dir: str,
    window_size: int = 3,
    min_score: float = 50.0,
) -> None:
    src = Path(src_dir)
    dst = Path(dst_dir)
    dst.mkdir(parents=True, exist_ok=True)

    frames = sorted(
        p for p in src.iterdir()
        if p.suffix.lower() in {".jpg", ".jpeg", ".png"}
    )

    kept = 0
    for i in range(0, len(frames), window_size):
        chunk = frames[i : i + window_size]
        scored = [(laplacian_score(p), p) for p in chunk]
        score, best = max(scored, key=lambda item: item[0])
        if score >= min_score:
            shutil.copy2(best, dst / best.name)
            kept += 1

    print(f"Total: {len(frames)}, Kept: {kept}")

if __name__ == "__main__":
    select_sharp_frames("data/scene01/raw_frames", "data/scene01/input", window_size=3, min_score=50.0)
```

实际使用时，建议先打印一批帧的 `laplacian_score` 分布，根据自己场景的纹理情况微调 `min_score`，避免误杀弱纹理视角。

## 用 COLMAP 跑 SfM 和去畸变

[COLMAP](https://github.com/colmap/colmap)（论文 *Structure-from-Motion Revisited*，Schönberger & Frahm, CVPR 2016，[PDF](https://openaccess.thecvf.com/content_cvpr_2016/papers/Schonberger_Structure-From-Motion_Revisited_CVPR_2016_paper.pdf)）是目前 3DGS 最常用的 SfM 工具链。官方 [graphdeco-inria/gaussian-splatting](https://github.com/graphdeco-inria/gaussian-splatting) 提供了封装脚本 `convert.py`，只要把图片放在 `data/scene01/input/` 下，一行命令即可自动跑完重建和去畸变：

```bash
python convert.py -s data/scene01
# 若需要像 Mip-NeRF 360 一样同时生成 1/2、1/4、1/8 缩放图（需安装 ImageMagick）：
# python convert.py -s data/scene01 --resize
```

但在排查问题或切换匹配策略（例如把全局匹配换成序列匹配）时，手动分步调用 COLMAP 命令行（参考 [COLMAP CLI 文档](https://colmap.github.io/cli.html)）会更透明可控。

### 分步命令行流程

下面的完整脚本依次执行**特征提取 → 特征匹配 → 增量稀疏重建 → 去畸变 → 整理 3DGS 目录结构**：

```bash
SCENE_DIR="data/scene01"
DISTORTED_DIR="${SCENE_DIR}/distorted"
mkdir -p "${DISTORTED_DIR}/sparse"

# 1. 特征提取（单相机固定焦距拍摄时开启 single_camera）
colmap feature_extractor \
  --database_path "${DISTORTED_DIR}/database.db" \
  --image_path "${SCENE_DIR}/input" \
  --ImageReader.camera_model OPENCV \
  --ImageReader.single_camera 1 \
  --FeatureExtraction.use_gpu 1

# 2. 特征匹配
# 方案 A：帧数 <= 300 或无序照片，使用全局两两匹配（召回率最高）
colmap exhaustive_matcher \
  --database_path "${DISTORTED_DIR}/database.db" \
  --FeatureMatching.use_gpu 1

# 方案 B：视频抽帧且帧数较多时，可改用序列匹配替代上面的 exhaustive_matcher：
# colmap sequential_matcher \
#   --database_path "${DISTORTED_DIR}/database.db" \
#   --SequentialMatching.overlap 20 \
#   --FeatureMatching.use_gpu 1

# 3. 增量式稀疏重建（SfM）
colmap mapper \
  --database_path "${DISTORTED_DIR}/database.db" \
  --image_path "${SCENE_DIR}/input" \
  --output_path "${DISTORTED_DIR}/sparse"

# 4. 去畸变并转换为 PINHOLE 模型（假设 0 是注册帧数最多的主模型）
colmap image_undistorter \
  --image_path "${SCENE_DIR}/input" \
  --input_path "${DISTORTED_DIR}/sparse/0" \
  --output_path "${SCENE_DIR}" \
  --output_type COLMAP \
  --max_image_size 2000

# 5. 整理 sparse/0 目录（重要！）
# image_undistorter 会将文件直接输出在 ${SCENE_DIR}/sparse/ 下，
# 而官方 3DGS 的 train.py 默认读取 ${SCENE_DIR}/sparse/0/
mkdir -p "${SCENE_DIR}/sparse/0"
mv "${SCENE_DIR}/sparse/"*.bin "${SCENE_DIR}/sparse/0/"
```

几点实用说明：

- **相机模型选择**：手机镜头带径向与少量切向畸变，一般用 `OPENCV`（参数为 $f_x, f_y, c_x, c_y, k_1, k_2, p_1, p_2$）或 `SIMPLE_RADIAL`（参数为 $f, c_x, c_y, k_1$）。经过 `image_undistorter` 之后，导出结果会自动变为无畸变的 `PINHOLE` 模型。
- **多子模型检查**：如果场景中间有断层，`colmap mapper` 会在 `distorted/sparse/` 下生成 `0/`、`1/` 等多个子模型目录，去畸变前务必确认哪一个子模型包含最多已注册图像，而不是盲目传 `0`。
- **无 GPU 环境与版本差异**：如果机器没有 CUDA 支持或 COLMAP 是纯 CPU 编译版本，把 `--FeatureExtraction.use_gpu` 和 `--FeatureMatching.use_gpu` 改为 `0` 即可。注意 COLMAP 3.13 及以上（含 4.x）将这两个参数名从 `--SiftExtraction.use_gpu` / `--SiftMatching.use_gpu` 改为了 `--FeatureExtraction.use_gpu` / `--FeatureMatching.use_gpu`；若本机安装的是 COLMAP 3.12 及更早版本，需用旧参数名。官方 `convert.py` 默认仍写着旧参数名，在新版 COLMAP 上直接运行可能会报 `unrecognised option`，建议改用上面的分步命令或按版本调整脚本。

### 3DGS 训练所需的最终目录结构

整理完成后，`data/scene01` 的目录结构如下：

```text
data/scene01/
├── input/                  # 原始带畸变图像（供溯源，训练时不直接读取）
├── distorted/              # 中间产物（database.db 与去畸变前的稀疏模型）
├── images/                 # image_undistorter 生成的去畸变图像（训练实际输入）
├── sparse/
│   └── 0/
│       ├── cameras.bin     # 去畸变后的 PINHOLE 相机内参
│       ├── images.bin      # 每张已注册图像的相机外参（世界到相机位姿）
│       └── points3D.bin    # 初始稀疏点云（坐标 + RGB 颜色）
└── stereo/                 # image_undistorter 附带生成的稠密配置目录（3DGS 训练可忽略）
```

如需人工检查二进制文件的内容，可以用 `colmap model_converter` 转为纯文本查看：

```bash
mkdir -p data/scene01/sparse_txt
colmap model_converter \
  --input_path data/scene01/sparse/0 \
  --output_path data/scene01/sparse_txt \
  --output_type TXT
```

> 实测记录【待补充：后续补上视频抽帧前后帧数、COLMAP 各阶段耗时、注册成功率及稀疏点云截图。】

## 用公开数据集练手

在用自己手机拍的数据正式开工之前，建议先下载一套公开标准数据集跑通 `train.py` 与可视化工具，先把 CUDA 环境、显存占用和渲染管线验证清楚，避免把环境问题误判成数据问题。

3DGS 论文和社区最常用的几套公开数据集如下：

- **[Mip-NeRF 360](https://jonbarron.info/mipnerf360/)**（官方代码库 [google-research/multinerf](https://github.com/google-research/multinerf)）：包含室外无界场景（如 `bicycle`、`garden`、`stump`）和室内场景（如 `room`、`counter`、`kitchen`、`bonsai`）。下载包内已经附带整理好的 COLMAP `sparse/0/` 文件和多尺度下采样图像（`images_2`、`images_4`、`images_8`），解压即可直接用于 3DGS 训练。
- **[Tanks and Temples](https://www.tanksandtemples.org/)**（[官方下载页](https://www.tanksandtemples.org/download/)）：涵盖大规模室外建筑与室内场景（如 `Truck`、`Train`、`Courthouse` 等），同时提供原始高清视频和图像序列，非常适合完整演练一遍“视频抽帧 → COLMAP SfM → 去畸变 → 3DGS 训练”。
- **3DGS 官方预处理合集**：在 [Inria 3D Gaussian Splatting 官方项目页](https://repo-sam.inria.fr/fungraph/3d-gaussian-splatting/) 中，作者还直接提供了预处理好 COLMAP 位姿的 **Tanks & Temples** 与 **Deep Blending**（如 `DrJohnson`、`Playroom`）子集数据包，方便快速复现论文基准效果。

以 Mip-NeRF 360 的 `garden` 场景为例，如果显存有限，可以先通过 `-r 4` 指定 $1/4$ 分辨率快速跑通流程：

```bash
python train.py -s data/mipnerf360/garden -r 4 -m output/garden_r4
```

## 已有 LiDAR 或 SLAM 位姿时怎么转成 COLMAP 格式

在机器人、自动驾驶或移动测绘场景下，往往已经通过激光雷达（LiDAR）SLAM（如 FAST-LIO / LIO-SAM）或视觉惯性里程计（VIO，如 ARKit / ARCore / ORB-SLAM3）拿到了高精度的轨迹与点云。这时完全可以绕过 SfM 位姿估计，把外部位姿直接转成 COLMAP 格式（详见 [COLMAP Output Format 官方文档](https://colmap.github.io/format.html)），再用已知位姿三角化或直接导入 LiDAR 点云初始化 3DGS。

转换过程中最容易踩坑的地方有三个：**相机坐标系朝向**、**变换方向（w2c vs c2w）**以及**四元数分量顺序**。

### 坐标系与相机朝向约定

COLMAP 采用标准计算机视觉（OpenCV）右手相机坐标系：

- **$+X$ 轴指向图像右侧**；
- **$+Y$ 轴指向图像下方**；
- **$+Z$ 轴指向相机前方（沿光轴进入场景）**。

如果外部位姿来自不同生态，必须先统一到 OpenCV 相机坐标系：

1. **OpenGL / Blender / NeRF / ARKit 相机系**（$+X$ 右、$+Y$ 上、$-Z$ 朝前）：对 Camera-to-World 旋转矩阵 $\mathbf{R}_{c2w}^{\text{gl}}$ 右乘坐标翻转矩阵，将局部 $Y, Z$ 轴反向：

   $$
   \mathbf{R}_{c2w}^{\text{cv}} = \mathbf{R}_{c2w}^{\text{gl}} \begin{bmatrix} 1 & 0 & 0 \\ 0 & -1 & 0 \\ 0 & 0 & -1 \end{bmatrix}
   $$

2. **ROS / LiDAR 载体坐标系**（常见 FLU：$+X$ 朝前、$+Y$ 向左、$+Z$ 向上）：如果轨迹记录的是雷达或车体在世界系下的位姿 $\mathbf{T}_{W \leftarrow B} \in SE(3)$，必须先右乘已经标定好的雷达-相机外参 $\mathbf{T}_{B \leftarrow C}$（即相机在载体坐标系下的位姿），换算到相机在世界系下的位姿：

   $$
   \mathbf{T}_{W \leftarrow C} = \mathbf{T}_{W \leftarrow B}\,\mathbf{T}_{B \leftarrow C}
   $$

### World-to-Camera 变换与四元数顺序

外部 SLAM / LiDAR 轨迹通常给出的是 **Camera-to-World（c2w）** 矩阵 $(\mathbf{R}_{c2w}, \mathbf{t}_{c2w})$，其中 $\mathbf{t}_{c2w} = \mathbf{C}$ 就是相机光心在世界坐标系中的三维坐标。

但 COLMAP 的 `images.txt` 存储的是 **World-to-Camera（w2c）** 变换 $(\mathbf{R}_{w2c}, \mathbf{t}_{w2c})$，满足 $\mathbf{p}_c = \mathbf{R}_{w2c}\mathbf{p}_w + \mathbf{t}_{w2c}$，两者互为逆变换：

$$
\mathbf{R}_{w2c} = \mathbf{R}_{c2w}^{\top}, \qquad
\mathbf{t}_{w2c} = -\mathbf{R}_{c2w}^{\top}\mathbf{t}_{c2w}
$$

写完文件后，可以用 $\mathbf{C} = -\mathbf{R}_{w2c}^{\top}\mathbf{t}_{w2c}$ 反向验算相机中心位置是否与原始轨迹一致。

此外，COLMAP 的旋转四元数遵循 **Hamilton 约定，顺序为 `(qw, qx, qy, qz)`（实部 `qw` 在最前面）**。而 `scipy.spatial.transform.Rotation.as_quat()` 默认返回 `(qx, qy, qz, qw)`，ROS 消息也是 `(x, y, z, w)`，导出时一定要手动重排。

### 三个文本文件的格式与转换示例

COLMAP 文本格式包含三个文件（放在 `sparse/0/` 中即可被多数 3DGS 实现读取，或再用 `model_converter` 转为 `.bin`）：

- **`cameras.txt`**：每个相机占一行，去畸变后通常使用 `PINHOLE` 模型：

```text
# CAMERA_ID, MODEL, WIDTH, HEIGHT, PARAMS[]
1 PINHOLE 1920 1080 1420.5 1420.5 960.0 540.0
```

- **`images.txt`**：每张图片必须占**两行**——第一行是位姿与元信息，第二行是二维特征点观测列表；如果直接用外部 LiDAR 点云初始化而不走 COLMAP 特征追踪，第二行可以留成空行，但**绝对不能省去该空行**：

```text
# IMAGE_ID, QW, QX, QY, QZ, TX, TY, TZ, CAMERA_ID, NAME
# POINTS2D[] as (X, Y, POINT3D_ID)
1 0.9998 0.0012 -0.0145 0.0031 -0.125 0.042 1.850 1 frame_00001.jpg

```

- **`points3D.txt`**：每个三维点占一行 `POINT3D_ID X Y Z R G B ERROR TRACK[]`。已有彩色 LiDAR 点云时，经体素下采样（例如 $2\text{ cm}$～$5\text{ cm}$）后直接写入即可（`ERROR` 写 `0`，`TRACK` 可留空）。

下面给出将 c2w 位姿矩阵（OpenCV 相机系）转换为 COLMAP `images.txt` 条目的核心 Python 示例：

```python
import numpy as np
from scipy.spatial.transform import Rotation

def c2w_to_colmap_pose(T_c2w: np.ndarray):
    """将 OpenCV 相机系下的 4x4 Camera-to-World 矩阵转为 COLMAP (qw, qx, qy, qz, tx, ty, tz)。"""
    R_c2w = T_c2w[:3, :3]
    t_c2w = T_c2w[:3, 3]

    R_w2c = R_c2w.T
    t_w2c = -R_w2c @ t_c2w

    # SciPy 默认返回 [qx, qy, qz, qw]，需重排为 COLMAP 的 [qw, qx, qy, qz]
    qx, qy, qz, qw = Rotation.from_matrix(R_w2c).as_quat()
    return (qw, qx, qy, qz), t_w2c

def write_images_txt(path: str, records: list[tuple[int, np.ndarray, int, str]]) -> None:
    """records 每项为 (image_id, T_c2w, camera_id, image_name)。"""
    with open(path, "w", encoding="utf-8") as f:
        f.write("# Image list with two lines of data per image:\n")
        f.write("#   IMAGE_ID, QW, QX, QY, QZ, TX, TY, TZ, CAMERA_ID, NAME\n")
        f.write("#   POINTS2D[] as (X, Y, POINT3D_ID)\n")
        for img_id, T_c2w, cam_id, name in records:
            (qw, qx, qy, qz), (tx, ty, tz) = c2w_to_colmap_pose(T_c2w)
            f.write(
                f"{img_id} {qw:.9f} {qx:.9f} {qy:.9f} {qz:.9f} "
                f"{tx:.9f} {ty:.9f} {tz:.9f} {cam_id} {name}\n\n"
            )
```

如果只有外部相机位姿、没有现成的 LiDAR 彩色点云，可以先写入 `cameras.txt`、`images.txt` 以及一个空的 `points3D.txt` 到 `manual_sparse/`，然后利用 COLMAP 的 `point_triangulator` 在**固定相机位姿**的前提下三角化生成稀疏点云，最后转为二进制格式：

```bash
colmap feature_extractor \
  --database_path data/scene01/database.db \
  --image_path data/scene01/images \
  --ImageReader.camera_model PINHOLE \
  --ImageReader.single_camera 1

colmap exhaustive_matcher \
  --database_path data/scene01/database.db

mkdir -p data/scene01/triangulated data/scene01/sparse/0

colmap point_triangulator \
  --database_path data/scene01/database.db \
  --image_path data/scene01/images \
  --input_path data/scene01/manual_sparse \
  --output_path data/scene01/triangulated

colmap model_converter \
  --input_path data/scene01/triangulated \
  --output_path data/scene01/sparse/0 \
  --output_type BIN
```

## 常见坑和排查

数据链路长，任何一步出偏差都会传导到最终渲染。下面是实践中最常遇到的三类问题与排查顺序。

### 注册失败（大量图像漏注册或分裂成多个子模型）

**常见现象**：跑完 `colmap mapper` 后，只有一半甚至更少的图片被注册成功，或者 `sparse/` 下面分裂出 `0/`、`1/`、`2/` 多个互不相连的小模型。

**常见原因与排查**：

- **重叠度断层或连续模糊帧**：把漏注册区间前后的图片打开检查，剔除拖影帧；若是视频抽帧，在断层处提高抽帧频率补回中间过渡帧。
- **中途变焦或手机自动切镜**：强行开启 `--ImageReader.single_camera 1` 会让内参约束和实际画面冲突。如果怀疑发生过切镜，可先去掉 `single_camera` 或改按不同镜头分组处理。
- **特征点过少或匹配范围不够**：弱纹理室内场景可适当降低 SIFT 峰值阈值（例如 `--SiftExtraction.peak_threshold 0.004`，默认 `0.0067`）；使用 `sequential_matcher` 时若存在回头看或大跨度重叠，需增大 `--SequentialMatching.overlap` 或直接换用 `exhaustive_matcher`。

### 位姿漂移（闭环不重合、走廊弯曲或双层墙）

**常见现象**：稀疏点云里同一面墙错位成两层、长轨迹明显发弯，或者 3DGS 渲染时不同视角切换出现明显跳变。

**常见原因与排查**：

- **缺少回环约束**：使用 `sequential_matcher` 处理长视频时，只匹配相邻帧会不断累积误差。要么改用 `exhaustive_matcher`，要么在 `sequential_matcher` 中通过 `--SequentialMatching.vocab_tree_path` 配置词袋树（Vocabulary Tree）并开启 `--SequentialMatching.loop_detection 1`。
- **畸变或焦距估计偏差**：广角镜头仅用 `SIMPLE_PINHOLE` 往往拟合不好畸变，会导致场景整体呈弧形弯曲。优先使用 `OPENCV` 相机模型，必要时通过 `--ImageReader.camera_params` 传入预先标定好的内参初值。
- **外部位姿时间不同步或外参有残差**：使用 LiDAR/SLAM 位姿时，相机曝光时间戳与雷达里程计差几十毫秒就会在快速转向处产生明显重影。先做时间偏移对齐与手眼外参校验；若存在微小位姿误差，可在三角化后尝试运行 `colmap bundle_adjuster` 做一次小幅度联合光束平差优化。

### 训练发散（渲染全黑/纯灰、大量浮空伪影或 OOM）

**常见现象**：3DGS 训练几百步后画面一片空白或全是雾状噪点，或者高斯点数量迅速暴涨直至显存溢出（OOM），甚至出现 `NaN` 损失。

**常见原因与排查**：

- **位姿方向或四元数写反（外部位姿最高发问题）**：把 `sparse/0/` 导入 COLMAP GUI 检查相机视锥（Frustum）朝向。如果相机全部背对点云或位置错乱，优先检查 c2w/w2c 是否漏取逆、OpenGL/OpenCV 的 $Y/Z$ 轴是否未翻转、四元数是否误写成了 `(qx, qy, qz, qw)`。
- **未去畸变或分辨率与内参不匹配**：检查 `sparse/0/cameras.*` 是否确实是 `PINHOLE` / `SIMPLE_PINHOLE`，并且记录的 `WIDTH`、`HEIGHT` 与 `images/` 下图片实际像素尺寸完全一致。如果手动缩放了图片，必须同步按比例缩放 `fx, fy, cx, cy`。
- **离群飞点拉大场景尺度**：极少数重投影误差极大的远距离飞点会把场景半径拉得异常大，进而影响 3DGS 的学习率缩放和自适应密度控制阈值。训练前先可视化稀疏点云，删掉明显脱离主体的离群飞点。
- **先低分辨率试跑**：面对新数据，先用 `-r 2` 或 `-r 4` 跑前 $1000$～$3000$ 步快速检查渲染图能否正常成形，确认几何和颜色收敛无误后，再开启全分辨率正式训练。

