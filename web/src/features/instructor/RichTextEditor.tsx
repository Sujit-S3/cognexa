import { useEffect } from 'react'
import { EditorContent, useEditor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import { Bold, Heading2, Italic, Link2, List, ListOrdered, Redo2, Undo2, Unlink } from 'lucide-react'
import styles from './InstructorWorkspace.module.css'

interface RichTextEditorProps {
  label: string
  value: string
  onChange: (html: string) => void
  help?: string
}

export function RichTextEditor({ label, value, onChange, help }: RichTextEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        link: {
          openOnClick: false,
          autolink: true,
          HTMLAttributes: { rel: 'noopener noreferrer' },
        },
      }),
    ],
    content: value,
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class: styles.richTextSurface,
        role: 'textbox',
        'aria-label': label,
        'aria-multiline': 'true',
      },
    },
    onUpdate: ({ editor: current }) => onChange(current.isEmpty ? '' : current.getHTML()),
  })

  useEffect(() => {
    if (editor && editor.getHTML() !== value) editor.commands.setContent(value, { emitUpdate: false })
  }, [editor, value])

  if (!editor)
    return (
      <div className={styles.richTextLoading} role="status">
        Loading editor…
      </div>
    )

  const setLink = () => {
    const existing = editor.getAttributes('link').href as string | undefined
    const url = window.prompt('Link URL', existing ?? 'https://')
    if (url === null) return
    if (!url.trim()) editor.chain().focus().extendMarkRange('link').unsetLink().run()
    else editor.chain().focus().extendMarkRange('link').setLink({ href: url.trim() }).run()
  }

  const controls = [
    {
      label: 'Undo',
      icon: Undo2,
      active: false,
      disabled: !editor.can().undo(),
      run: () => editor.chain().focus().undo().run(),
    },
    {
      label: 'Redo',
      icon: Redo2,
      active: false,
      disabled: !editor.can().redo(),
      run: () => editor.chain().focus().redo().run(),
    },
    {
      label: 'Heading',
      icon: Heading2,
      active: editor.isActive('heading', { level: 2 }),
      disabled: false,
      run: () => editor.chain().focus().toggleHeading({ level: 2 }).run(),
    },
    {
      label: 'Bold',
      icon: Bold,
      active: editor.isActive('bold'),
      disabled: false,
      run: () => editor.chain().focus().toggleBold().run(),
    },
    {
      label: 'Italic',
      icon: Italic,
      active: editor.isActive('italic'),
      disabled: false,
      run: () => editor.chain().focus().toggleItalic().run(),
    },
    {
      label: 'Bulleted list',
      icon: List,
      active: editor.isActive('bulletList'),
      disabled: false,
      run: () => editor.chain().focus().toggleBulletList().run(),
    },
    {
      label: 'Numbered list',
      icon: ListOrdered,
      active: editor.isActive('orderedList'),
      disabled: false,
      run: () => editor.chain().focus().toggleOrderedList().run(),
    },
    { label: 'Add link', icon: Link2, active: editor.isActive('link'), disabled: false, run: setLink },
    {
      label: 'Remove link',
      icon: Unlink,
      active: false,
      disabled: !editor.isActive('link'),
      run: () => editor.chain().focus().unsetLink().run(),
    },
  ]

  return (
    <div className={styles.richTextField}>
      <span className={styles.label}>{label}</span>
      <div className={styles.richTextEditor}>
        <div className={styles.richTextToolbar} role="toolbar" aria-label={`${label} formatting`}>
          {controls.map((control) => {
            const Icon = control.icon
            return (
              <button
                key={control.label}
                type="button"
                aria-label={control.label}
                aria-pressed={control.active}
                disabled={control.disabled}
                onClick={control.run}
              >
                <Icon size={16} />
              </button>
            )
          })}
        </div>
        <EditorContent editor={editor} />
      </div>
      {help && <small>{help}</small>}
    </div>
  )
}
