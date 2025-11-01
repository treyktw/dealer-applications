// src/components/PDFFieldInspector.tsx
// Deep inspection tool to see what's actually in the PDF

import { useEffect, useState } from 'react';
import { PDFDocument } from 'pdf-lib';

interface PDFFieldInspectorProps {
  pdfBuffer: ArrayBuffer | null;
}

interface FieldInfo {
  name: string;
  type: string;
  value: any;
  hasAppearance: boolean;
  rect: number[] | null;
  backgroundColor: any;
  borderColor: any;
  flags: number;
  widgets: number;
}

export function PDFFieldInspector({ pdfBuffer }: PDFFieldInspectorProps) {
  const [fields, setFields] = useState<FieldInfo[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!pdfBuffer) return;

    const analyze = async () => {
      setIsAnalyzing(true);
      setError(null);

      try {
        const pdfDoc = await PDFDocument.load(pdfBuffer, {
          ignoreEncryption: true,
        });

        const form = pdfDoc.getForm();
        const pdfFields = form.getFields();

        const fieldInfos: FieldInfo[] = [];

        for (const field of pdfFields) {
          const name = field.getName();
          
          // Get the field's AcroForm object
          const acroField = (field as any).acroField;
          const widgets = acroField?.getWidgets() || [];
          
          // Check for appearance streams
          let hasAppearance = false;
          let rect = null;
          let backgroundColor = null;
          let borderColor = null;
          
          if (widgets.length > 0) {
            const widget = widgets[0];
            const dict = widget.dict;
            
            // Check for appearance dictionary
            const ap = dict.get('AP' as any);
            hasAppearance = ap !== undefined && ap !== null;
            
            // Get rectangle
            const rectObj = dict.get('Rect' as any);
            rect = rectObj ? rectObj.toString() : null;
            
            // Get MK (appearance characteristics)
            const mk = dict.get('MK' as any);
            if (mk) {
              const bg = mk.get('BG' as any);
              const bc = mk.get('BC' as any);
              backgroundColor = bg ? bg.toString() : null;
              borderColor = bc ? bc.toString() : null;
            }
          }

          let value: any;
          let type: string;

          try {
            if ('getText' in field) {
              type = 'Text';
              value = (field as any).getText();
            } else if ('isChecked' in field) {
              type = 'Checkbox';
              value = (field as any).isChecked();
            } else if ('getSelected' in field) {
              type = 'Dropdown';
              value = (field as any).getSelected();
            } else {
              type = field.constructor.name;
              value = 'N/A';
            }
          } catch {
            type = 'Unknown';
            value = 'Error reading';
          }

          fieldInfos.push({
            name,
            type,
            value,
            hasAppearance,
            rect,
            backgroundColor,
            borderColor,
            flags: acroField?.getFlags() || 0,
            widgets: widgets.length,
          });
        }

        setFields(fieldInfos);
        
        console.log('📊 PDF Field Analysis:', {
          totalFields: fieldInfos.length,
          fieldsWithAppearances: fieldInfos.filter(f => f.hasAppearance).length,
          fieldsWithBackgrounds: fieldInfos.filter(f => f.backgroundColor).length,
        });

      } catch (err) {
        console.error('❌ Analysis failed:', err);
        setError(err instanceof Error ? err.message : String(err));
      } finally {
        setIsAnalyzing(false);
      }
    };

    analyze();
  }, [pdfBuffer]);

  if (!pdfBuffer) {
    return null;
  }

  if (isAnalyzing) {
    return (
      <div className="p-4 bg-blue-50 rounded border border-blue-200">
        <p className="text-sm">Analyzing PDF fields...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 rounded border border-red-200">
        <p className="text-sm text-red-700">Analysis error: {error}</p>
      </div>
    );
  }

  if (fields.length === 0) {
    return (
      <div className="p-4 bg-yellow-50 rounded border border-yellow-200">
        <p className="text-sm text-yellow-700">No form fields found in PDF</p>
      </div>
    );
  }

  const fieldsWithAppearances = fields.filter(f => f.hasAppearance).length;
  const fieldsWithBackgrounds = fields.filter(f => f.backgroundColor).length;

  return (
    <div className="p-4 bg-zinc-950 rounded space-y-3">
      <h3 className="font-bold text-lg">PDF Field Inspector</h3>
      
      <div className="grid grid-cols-3 gap-2 text-sm">
        <div className="p-2 bg-zinc-500 rounded">
          <div className="font-semibold">Total Fields</div>
          <div className="text-2xl">{fields.length}</div>
        </div>
        <div className="p-2 bg-green-500 rounded">
          <div className="font-semibold">With Appearances</div>
          <div className="text-2xl">{fieldsWithAppearances}</div>
        </div>
        <div className="p-2 bg-blue-500 rounded">
          <div className="font-semibold">With Backgrounds</div>
          <div className="text-2xl">{fieldsWithBackgrounds}</div>
        </div>
      </div>

      <details className="border rounded p-2">
        <summary className="cursor-pointer font-semibold">
          View All Fields ({fields.length})
        </summary>
        <div className="mt-2 max-h-96 overflow-y-auto">
          <table className="w-full text-xs">
            <thead className="bg-zinc-900 sticky top-0">
              <tr>
                <th className="p-2 text-left">Name</th>
                <th className="p-2 text-left">Type</th>
                <th className="p-2 text-left">Value</th>
                <th className="p-2 text-center">Appearance</th>
                <th className="p-2 text-center">BG Color</th>
              </tr>
            </thead>
            <tbody>
              {fields.map((field) => (
                <tr key={field.name} className="border-t">
                  <td className="p-2 font-mono text-xs">{field.name}</td>
                  <td className="p-2">{field.type}</td>
                  <td className="p-2 font-mono text-xs max-w-xs truncate">
                    {String(field.value)}
                  </td>
                  <td className="p-2 text-center">
                    {field.hasAppearance ? (
                      <span className="text-green-600">✓</span>
                    ) : (
                      <span className="text-red-600">✗</span>
                    )}
                  </td>
                  <td className="p-2 text-center font-mono text-xs">
                    {field.backgroundColor || '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>

      {fieldsWithAppearances === 0 && (
        <div className="p-3 bg-red-50 border border-red-200 rounded">
          <p className="text-sm text-red-800 font-semibold">
            ⚠️ Problem Found: No fields have appearance streams!
          </p>
          <p className="text-xs text-red-700 mt-1">
            This is why fields don't show properly. They need to be regenerated with appearances.
          </p>
        </div>
      )}

      {fieldsWithBackgrounds === 0 && (
        <div className="p-3 bg-orange-50 border border-orange-200 rounded">
          <p className="text-sm text-orange-800 font-semibold">
            ⚠️ Problem Found: No fields have background colors!
          </p>
          <p className="text-xs text-orange-700 mt-1">
            Fields need background colors set in the PDF itself to show the blue boxes.
          </p>
        </div>
      )}
    </div>
  );
}