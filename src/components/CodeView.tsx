import { Highlight, themes } from "prism-react-renderer";

interface CodeViewProps {
  filename: string;
  source: string;
}

const CodeView = ({ filename, source }: CodeViewProps) => {
  return (
    <div className="h-full flex flex-col font-mono text-sm overflow-hidden">
      {/* Tab bar */}
      <div className="flex items-center gap-2 px-4 py-2 border-b bg-neutral-50 text-neutral-500 text-xs shrink-0">
        <span className="text-neutral-800 font-medium">{filename}</span>
      </div>

      {/* Code area */}
      <Highlight theme={themes.vsLight} code={source.trimEnd()} language="tsx">
        {({ tokens, getLineProps, getTokenProps }) => (
          <div className="flex-1 overflow-auto">
            <table className="w-full border-collapse">
              <tbody>
                {tokens.map((line, i) => {
                  const lineProps = getLineProps({ line });
                  return (
                    <tr
                      key={i}
                      {...lineProps}
                      className={`hover:bg-neutral-50 ${lineProps.className ?? ""}`}>
                      <td className="select-none text-right pr-4 pl-4 text-neutral-400 text-xs w-10 shrink-0 align-top leading-relaxed">
                        {i + 1}
                      </td>
                      <td className="pr-6 align-top leading-relaxed whitespace-pre">
                        {line.map((token, j) => (
                          <span key={j} {...getTokenProps({ token })} />
                        ))}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Highlight>
    </div>
  );
};

export default CodeView;
