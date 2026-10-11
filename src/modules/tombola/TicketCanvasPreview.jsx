import { Group, Image, Layer, Line, Rect, Stage, Text } from "react-konva";
import { formatTicketNumber, normalizeTemplate } from "./ticketModel";
import { getTextRenderProps } from "./textStyles";
import useCanvasImage from "./useCanvasImage";

function PreviewImageObject({ object }) {
  const image = useCanvasImage(object.src);

  return (
    <Image
      height={object.height || 80}
      image={image}
      rotation={object.rotation || 0}
      width={object.width || 80}
      x={object.x}
      y={object.y}
    />
  );
}

function PreviewLineObject({ object }) {
  const points = object.points || [0, 0, 120, 0];

  return (
    <Line
      dash={object.dash ? [10, 6] : undefined}
      lineCap="round"
      points={points}
      rotation={object.rotation || 0}
      stroke={object.stroke || "#111827"}
      strokeWidth={object.strokeWidth || 2}
      x={object.x}
      y={object.y}
    />
  );
}

function PreviewTextObject({ object, numberLabel }) {
  const textRenderProps = getTextRenderProps(object);
  const textValue = object.type === "number" ? numberLabel : object.text;
  const textLayoutProps = {
    align: object.align || "left",
    fontSize: object.fontSize || 24,
    fontStyle: [object.fontVariant === "bold" ? "bold" : "", object.fontStyle === "italic" ? "italic" : ""].filter(Boolean).join(" "),
    text: textValue,
    width: object.width || 220,
    x: object.x,
    y: object.y,
  };
  const hasVisibleHalo = Number(object.shadowBlur || 0) > 0 && Boolean(object.shadowColor);

  return (
    <>
      {hasVisibleHalo ? (
        <Text
          {...textLayoutProps}
          fill={object.shadowColor}
          fontFamily={textRenderProps.fontFamily}
          opacity={Math.max(0.2, Math.min(0.5, textRenderProps.shadowOpacity * 0.42))}
          shadowBlur={Math.min(28, Number(object.shadowBlur || 0))}
          shadowColor={object.shadowColor}
          shadowOpacity={textRenderProps.shadowOpacity}
          stroke={object.shadowColor}
          strokeWidth={Math.max(2, Math.min(18, Number(object.shadowBlur || 0) / 3))}
        />
      ) : null}
      <Text {...textLayoutProps} {...textRenderProps} />
    </>
  );
}

function PreviewObject({ object, numberLabel }) {
  if (object.type === "image") return <PreviewImageObject object={object} />;
  if (object.type === "line") return <PreviewLineObject object={object} />;
  return <PreviewTextObject numberLabel={numberLabel} object={object} />;
}

export default function TicketCanvasPreview({ number = 1, template }) {
  const currentTemplate = normalizeTemplate(template);
  const canvas = currentTemplate.canvas;
  const padding = 28;
  const scale = Math.min(0.82, 820 / (canvas.width + padding * 2), 330 / (canvas.height + padding * 2));
  const numberLabel = formatTicketNumber(number, currentTemplate.numberingDigits);

  return (
    <div className="ticket-canvas-preview">
      <Stage height={(canvas.height + padding * 2) * scale} scaleX={scale} scaleY={scale} width={(canvas.width + padding * 2) * scale}>
        <Layer>
          <Group x={padding} y={padding}>
            <Rect fill={canvas.backgroundColor || "#ffffff"} height={canvas.height} stroke="#111827" strokeWidth={2} width={canvas.width} x={0} y={0} />
            {canvas.objects.map((object) => (
              <PreviewObject key={object.id} numberLabel={numberLabel} object={object} />
            ))}
          </Group>
        </Layer>
      </Stage>
    </div>
  );
}
